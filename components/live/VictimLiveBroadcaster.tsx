'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LiquidGlassCard } from '@/components/ui/liquid-glass-card';
import { Button } from '@/components/ui/button';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface Props {
  alertId: string;
}

export default function VictimLiveBroadcaster({ alertId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [responderCount, setResponderCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  /* ======================
     START CAMERA
  ====================== */
  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraReady(true);
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ======================
     WEBRTC OFFER
  ====================== */
  useEffect(() => {
    if (!cameraReady || !streamRef.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    streamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        supabase.from('webrtc_signals').insert({
          alert_id: alertId,
          type: 'ice',
          payload: e.candidate,
        });
      }
    };

    const createOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('webrtc_signals').insert({
        alert_id: alertId,
        type: 'offer',
        payload: offer,
      });
    };

    createOffer();

    const channel = supabase
      .channel(`signal-${alertId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webrtc_signals' },
        async ({ new: signal }) => {
          if (signal.type === 'answer') {
            await pc.setRemoteDescription(signal.payload);
          }

          if (signal.type === 'ice') {
            await pc.addIceCandidate(signal.payload);
          }
        }
      )
      .subscribe();

    return () => {
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [alertId, cameraReady]);

  /* ======================
     RESPONDER COUNT
  ====================== */
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('live_responders')
        .select('*', { count: 'exact', head: true })
        .eq('alert_id', alertId);

      setResponderCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`responders-${alertId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_responders' },
        fetchCount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  /* ======================
     UI
  ====================== */
  return (
    <div className="fixed inset-0 bg-black text-white z-50">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <LiquidGlassCard className="px-4 py-1 bg-red-600 rounded-full">
          🔴 LIVE · {responderCount} responders
        </LiquidGlassCard>

        <Button variant="outline">End</Button>
      </div>
    </div>
  );
}
