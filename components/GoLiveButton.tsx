'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  /* =============== CAMERA CONTROLS =============== */
  const toggleCamera = async () => {
    if (!streamRef.current) return;

    // Stop current stream
    streamRef.current.getTracks().forEach((t) => t.stop());

    // Switch camera
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Re-add tracks to peer connection if live
      if (isLive && peerRef.current) {
        // Remove old tracks
        peerRef.current
          .getSenders()
          .forEach((sender) => peerRef.current?.removeTrack(sender));

        // Add new tracks
        stream.getTracks().forEach((t) => peerRef.current?.addTrack(t, stream));
      }

      toast.success(
        `📱 Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`
      );
    } catch (err) {
      console.error('Camera switch error:', err);
      toast.error('Failed to switch camera');
      setFacingMode(facingMode); // Revert
    }
  };

  /* =============== START LIVE =============== */
  const startLive = async () => {
    if (starting || isLive) return;
    setStarting(true);

    try {
      // 1️⃣ Request camera FIRST (independent from backend)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Camera permission denied:', msg);
        throw new Error(
          `📷 Camera access denied. Please enable permissions in settings: ${msg}`
        );
      }

      // 2️⃣ Ensure backend alert exists
      let generatedAlertId = alertId ?? (await onStart());
      if (!generatedAlertId) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('🚨 Emergency alert creation failed. Check your connection.');
      }
      setAlertId(generatedAlertId);

      // 3️⃣ Attach stream to video element
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 4️⃣ Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : '';

      if (!mimeType) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('🎥 Your device does not support video recording');
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;

      // 5️⃣ Setup WebRTC
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
      if (offerError) {
        console.warn('WebRTC signal failed (non-critical):', offerError);
        // Don't throw - continue without WebRTC
      }

      setIsLive(true);
      toast.success('🔴 You are LIVE - Camera stream active');
    } catch (err) {
      console.error('GoLive error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start live stream';
      toast.error(errorMessage);
      setIsLive(false);
      // Clean up on error
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
      recorderRef.current = null;
      streamRef.current = null;
    } finally {
      setStarting(false);
    }
  };

  /* =============== STOP LIVE =============== */
  const stopLive = async () => {
    try {
      // Stop recording and tracks
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();

      setIsLive(false);

      // Prepare and upload recording
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      if (alertId) {
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(`alerts/${alertId}.webm`, blob, { upsert: true });

        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from('emergency_alerts')
          .update({ status: 'ended' })
          .eq('id', alertId);

        if (updateError) throw updateError;
      }

      toast.success('✅ Live ended & recording saved');
    } catch (err) {
      console.error('StopLive error:', err);
      toast.error(err instanceof Error ? err.message : 'Error ending live');
    }
  };

  /* =============== UI =============== */
  return (
    <div className="space-y-4">
      <div className="relative w-full rounded-xl bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-[400px] object-cover"
        />
        {isLive && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            CAMERA ACTIVE
          </div>
        )}
        {/* Camera toggle button */}
        {(isLive || streamRef.current) && (
          <button
            onClick={toggleCamera}
            disabled={starting}
            className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg"
            title="Switch camera"
          >
            <RotateCw size={18} />
          </button>
        )}
      </div>

      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-300">
        <p className="font-semibold mb-1">📷 Camera Preview Mode</p>
        <p>Your camera is visible locally. Responders can see your location and emergency details.</p>
      </div>

      {!isLive ? (
        <Button
          disabled={starting}
          onClick={startLive}
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
        >
          {starting ? 'Initializing camera…' : '🔴 Activate Camera'}
        </Button>
      ) : (
        <Button
          onClick={stopLive}
          className="w-full py-4 bg-black text-white rounded-xl border border-red-600 hover:bg-red-950"
        >
          ⏹ Stop Camera
        </Button>
      )}
    </div>
  );
}
