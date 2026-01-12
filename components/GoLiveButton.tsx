'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface Props {
  /**
   * Parent should return alertId when Go Live is triggered.
   * app/page.tsx already does this correctly.
   */
  onStart: () => Promise<string | null>;
  alertId: string | null;
}

export default function GoLiveButton({ onStart, alertId: parentAlertId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isLive, setIsLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(parentAlertId);

  /* ---------------- START LIVE ---------------- */
  const startLive = async () => {
    if (starting || isLive) return;
    setStarting(true);

    try {
      // 1️⃣ Ensure alertId exists
      let generatedAlertId = alertId ?? (await onStart());
      if (!generatedAlertId) throw new Error('Alert creation failed');
      setAlertId(generatedAlertId);

      // 2️⃣ Request camera + mic
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      } catch (err) {
        throw new Error('Camera/Microphone access denied or unavailable');
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // 3️⃣ Setup MediaRecorder with fallback MIME type
      const mimeType = MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : '';
      if (!mimeType) throw new Error('No supported MIME type for recording');

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;

      // 4️⃣ Setup WebRTC
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await supabase.from('webrtc_signals').insert({
              alert_id: generatedAlertId,
              type: 'ice',
              payload: e.candidate,
            });
          } catch (err) {
            console.warn('Failed to send ICE candidate:', err);
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { error: offerError } = await supabase.from('webrtc_signals').insert({
        alert_id: generatedAlertId,
        type: 'offer',
        payload: offer,
      });
      if (offerError) throw offerError;

      setIsLive(true);
      toast.success('🔴 You are LIVE');
    } catch (err) {
      console.error('GoLive error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to go live');
    } finally {
      setStarting(false);
    }
  };

  /* ---------------- STOP LIVE ---------------- */
  const stopLive = async () => {
    try {
      // Stop recorder & tracks
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();

      setIsLive(false);

      // Prepare recording
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      if (alertId) {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(`alerts/${alertId}.webm`, blob, { upsert: true });
        if (uploadError) throw uploadError;

        // Update alert status
        const { error: updateError } = await supabase
          .from('emergency_alerts')
          .update({ status: 'ended' })
          .eq('id', alertId);
        if (updateError) throw updateError;
      }

      toast.success('Live ended & recording saved');
    } catch (err) {
      console.error('StopLive error:', err);
      toast.error(err instanceof Error ? err.message : 'Error ending live');
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-[400px] rounded-xl bg-black object-cover"
      />

      {!isLive ? (
        <Button
          disabled={starting}
          onClick={startLive}
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
        >
          {starting ? 'Starting…' : '🔴 Go Live'}
        </Button>
      ) : (
        <Button
          onClick={stopLive}
          className="w-full py-4 bg-black text-white rounded-xl"
        >
          End Live
        </Button>
      )}
    </div>
  );
}
