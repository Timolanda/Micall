'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type LiveStatus = 'idle' | 'preparing' | 'live' | 'stopped';

export default function GoLiveButton() {
  const router = useRouter();

  /** ---------------- STATE ---------------- */
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLiveUIActive, setIsLiveUIActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  /** ---------------- REFS ---------------- */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const isRecordingRef = useRef(false);

  /** ---------------- MEDIA ---------------- */
  const requestMedia = useCallback(async (mode?: 'user' | 'environment') => {
    // Stop existing tracks safely
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode || facingMode },
      audio: true,
    });

    mediaStreamRef.current = stream;

    if (videoRef.current) {
      // Detach old stream first to prevent flicker
      videoRef.current.srcObject = null;
      videoRef.current.srcObject = stream;
    }

    return stream;
  }, [facingMode]);

  /** ---------------- START LIVE ---------------- */
  const startLive = async () => {
    try {
      setStatus('preparing');
      setIsFullScreen(true);
      setIsLiveUIActive(true);

      // Open camera + mic immediately
      await requestMedia();

      // Start recording
      const recorder = new MediaRecorder(mediaStreamRef.current!);
      mediaRecorderRef.current = recorder;
      recorder.start();
      isRecordingRef.current = true;

      // Start timer for UX
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (videoRef.current) {
          const timeDisplay = videoRef.current.parentElement?.querySelector<HTMLSpanElement>('#live-timer');
          if (timeDisplay) timeDisplay.textContent = formatTime(durationRef.current);
        }
      }, 1000);

      setStatus('live');
      toast.success('🔴 You are LIVE');

      // Example: Safely create Supabase alert after live starts
      // await supabase.from('live_alerts').insert({ status: 'live', started_at: new Date() });

    } catch (err) {
      console.error(err);
      toast.error('Failed to start live stream');
      stopLive();
    }
  };

  /** ---------------- STOP LIVE ---------------- */
  const stopLive = () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn('MediaRecorder already stopped', err);
    }

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    setStatus('stopped');
    setIsLiveUIActive(false);
    setIsFullScreen(false);
    durationRef.current = 0;
  };

  /** ---------------- CAMERA SWITCH ---------------- */
  const switchCamera = async () => {
    if (isRecordingRef.current) {
      toast.warning('Stop live before switching camera');
      return;
    }

    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await requestMedia(newMode);
  };

  /** ---------------- CLEANUP ---------------- */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  /** ---------------- FULLSCREEN LIVE UI ---------------- */
  if (isFullScreen && isLiveUIActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
        {/* VIDEO */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="flex-1 object-cover"
        />

        {/* TOP BAR */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <span id="live-timer" className="bg-red-600 px-3 py-1 rounded-full text-sm font-semibold">
            🔴 LIVE 0:00
          </span>
          <button
            onClick={() => {
              if (confirm('End live stream?')) stopLive();
            }}
            className="bg-black/60 px-3 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 pb-24 md:pb-10 px-6">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 flex justify-around items-center">
            <button
              onClick={switchCamera}
              className="px-4 py-2 bg-white/10 rounded-lg"
            >
              🔄 Camera
            </button>

            <button
              onClick={stopLive}
              className="px-6 py-3 bg-red-600 rounded-full font-bold"
            >
              END LIVE
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** ---------------- DEFAULT BUTTON ---------------- */
  return (
    <button
      onClick={startLive}
      className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg shadow-lg active:scale-95 transition"
    >
      🔴 Go Live
    </button>
  );
}

/** ---------------- HELPERS ---------------- */
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
