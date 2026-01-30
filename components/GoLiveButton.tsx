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
   * Optional callback when emergency alert is created.
   * This component no longer depends on it.
   */
  onAlertCreated?: (alertId: string) => void;
}

export default function GoLiveButton({ onAlertCreated }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isLive, setIsLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
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
      // 1️⃣ FAIL FAST: Check authentication
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        console.error('❌ Auth check failed:', authError);
        throw new Error('👤 Not authenticated. Please sign in first.');
      }
      const uid = authData.user.id;
      console.log('✅ User authenticated:', uid);

      // 2️⃣ Request camera (independent from backend)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Camera permission denied:', msg);
        throw new Error(
          `📷 Camera access denied. Please enable permissions in settings: ${msg}`
        );
      }
      console.log('✅ Camera access granted');

      // 3️⃣ Get user location (required for alert)
      const userLocation = await new Promise<[number, number] | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      if (!userLocation) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('📍 Unable to get your location. Enable location services.');
      }

      const [lat, lng] = userLocation;
      console.log('✅ Location acquired:', { lat, lng });

      // 4️⃣ Create emergency alert in Supabase (CRITICAL - must succeed)
      console.log('📍 Creating emergency alert...');
      const { data: alertData, error: alertError } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: uid,
          status: 'active',
          lat,
          lng,
          type: 'video',
          message: 'Go Live activated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (alertError) {
        stream.getTracks().forEach((t) => t.stop());
        console.error('❌ Alert creation failed:', alertError);
        
        // Surface the real error
        const errorDetail = alertError.message || alertError.code || 'Unknown error';
        throw new Error(`🚨 Alert creation failed: ${errorDetail}`);
      }

      if (!alertData?.id) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('🚨 No alert ID returned from server');
      }

      const generatedAlertId = String(alertData.id);
      console.log('✅ Emergency alert created:', generatedAlertId);
      setAlertId(generatedAlertId);
      onAlertCreated?.(generatedAlertId);

      // 5️⃣ Attach stream to video element
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 6️⃣ Setup MediaRecorder
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
      console.log('✅ MediaRecorder started');

      // 7️⃣ Setup WebRTC (TEMPORARILY DISABLED - focus on core alert stability)
      // const pc = new RTCPeerConnection(ICE_SERVERS);
      // peerRef.current = pc;
      // stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      // console.log('ℹ️ WebRTC disabled for now - core alert is priority');

      setIsLive(true);
      toast.success('🔴 You are LIVE - Camera stream active');
      console.log('✅ Go Live successful');
    } catch (err) {
      console.error('❌ GoLive error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start live stream';
      toast.error(errorMessage);
      
      // DEFENSIVE CLEANUP - Reset state on failure
      setIsLive(false);
      setAlertId(null); // Reset so retries work
      
      // Stop all media tracks
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
          console.log(`🛑 Stopped track: ${t.kind}`);
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });

      // Close peer connection
      if (peerRef.current) {
        try {
          peerRef.current.close();
          console.log('🛑 Peer connection closed');
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
      }

      // Stop recorder
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
          console.log('🛑 Recorder stopped');
        } catch (e) {
          console.warn('Error stopping recorder:', e);
        }
      }

      // Clear streams and recorder refs
      streamRef.current = null;
      peerRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
    } finally {
      setStarting(false);
    }
  };

  /* =============== STOP LIVE =============== */
  const stopLive = async () => {
    try {
      // Defensive cleanup - try to stop everything
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
          console.log('🛑 Recorder stopped');
        } catch (e) {
          console.warn('Error stopping recorder:', e);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
            console.log(`🛑 Stopped track: ${t.kind}`);
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
      }

      if (peerRef.current) {
        try {
          peerRef.current.close();
          console.log('🛑 Peer connection closed');
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
      }

      setIsLive(false);

      // Prepare and upload recording
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      if (alertId) {
        try {
          const { error: uploadError } = await supabase.storage
            .from('evidence')
            .upload(`alerts/${alertId}.webm`, blob, { upsert: true });

          if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw uploadError;
          }
          console.log('✅ Recording uploaded');
        } catch (uploadErr) {
          console.error('❌ Recording upload failed:', uploadErr);
          // Non-fatal - continue to update alert status
        }

        try {
          const { error: updateError } = await supabase
            .from('emergency_alerts')
            .update({ status: 'ended', updated_at: new Date().toISOString() })
            .eq('id', Number(alertId));

          if (updateError) {
            console.error('❌ Status update error:', updateError);
            throw updateError;
          }
          console.log('✅ Alert status updated to ended');
        } catch (updateErr) {
          console.error('❌ Alert update failed:', updateErr);
          // Non-fatal
        }
      }

      // Clear state
      setAlertId(null);
      streamRef.current = null;
      peerRef.current = null;
      recorderRef.current = null;

      toast.success('✅ Live ended & recording saved');
    } catch (err) {
      console.error('❌ StopLive error:', err);
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
            disabled={starting || !isLive}
            className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg disabled:opacity-50"
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
