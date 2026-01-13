'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { LiquidGlassCard } from '@/components/ui/liquid-glass-card';
import { Button } from '@/components/ui/button';
import type { LatLng } from './ResponderMap';

/* ======================
   SAFE DYNAMIC MAP IMPORT
====================== */
const ResponderMap = dynamic(() => import('./ResponderMap'), {
  ssr: false,
});

/* ======================
   WEBRTC CONFIG
====================== */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface Props {
  alertId: string;
  responderId: string;
  alertLat: number;
  alertLng: number;
}

export default function ResponderLiveViewer({
  alertId,
  responderId,
  alertLat,
  alertLng,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [responderCount, setResponderCount] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [responderLocation, setResponderLocation] = useState<LatLng | null>(null);
  const [otherResponders, setOtherResponders] = useState<LatLng[]>([]);

  /* ======================
     GET RESPONDER LOCATION
  ====================== */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setResponderLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => console.warn('Location permission denied'),
      { enableHighAccuracy: true }
    );
  }, []);

  /* ======================
     JOIN / LEAVE RESPONDERS
  ====================== */
  useEffect(() => {
    supabase.from('live_responders').insert({
      alert_id: alertId,
      responder_id: responderId,
    });

    const channel = supabase
      .channel(`live-responders-${alertId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_responders' },
        async () => {
          const { data, count } = await supabase
            .from('live_responders')
            .select('responder_id, lat, lng', { count: 'exact' })
            .eq('alert_id', alertId);

          setResponderCount(count || 0);

          if (data) {
            setOtherResponders(
              data
                .filter((r) => r.responder_id !== responderId)
                .map((r) => ({ lat: r.lat, lng: r.lng }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase
        .from('live_responders')
        .delete()
        .eq('alert_id', alertId)
        .eq('responder_id', responderId);

      supabase.removeChannel(channel);
    };
  }, [alertId, responderId]);

  /* ======================
     WEBRTC STREAM HANDLING
  ====================== */
  useEffect(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current) {
        videoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        supabase.from('webrtc_signals').insert({
          alert_id: alertId,
          type: 'ice',
          payload: e.candidate,
        });
      }
    };

    const channel = supabase
      .channel(`signal-${alertId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webrtc_signals' },
        async ({ new: signal }) => {
          if (signal.type === 'offer') {
            await pc.setRemoteDescription(signal.payload);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await supabase.from('webrtc_signals').insert({
              alert_id: alertId,
              type: 'answer',
              payload: answer,
            });
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
  }, [alertId]);

  /* ======================
     UI RENDER
  ====================== */
  return (
    <div className="fixed inset-0 bg-black text-white">
      {/* ======================
          VIDEO BACKGROUND
      ====================== */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* ======================
          UI OVERLAY
      ====================== */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
          <LiquidGlassCard className="px-3 py-1 bg-red-600 rounded-full">
            🔴 LIVE · {responderCount} responders
          </LiquidGlassCard>

          <Button onClick={() => setShowMap(true)}>🗺 Map</Button>
        </div>
      </div>

      {/* ======================
          MAP OVERLAY
      ====================== */}
      {showMap && responderLocation && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div className="absolute inset-0">
            <ResponderMap
              responder={responderLocation}
              victim={{ lat: alertLat, lng: alertLng }}
              otherResponders={otherResponders}
              mode="live"
              onClose={() => setShowMap(false)}
              maxHeight="100%"
            />
          </div>
        </div>
      )}
    </div>
  );
}
