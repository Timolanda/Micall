'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

type LiveStatus = 'idle' | 'preparing' | 'live' | 'stopped';

interface GoLiveButtonProps {
  onStart?: () => Promise<void>;
}

export default function GoLiveButton({ onStart }: GoLiveButtonProps) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const isRecordingRef = useRef(false);

  const requestMedia = useCallback(async (mode?: 'user' | 'environment') => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode || facingMode },
      audio: true,
    });

    mediaStreamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    return stream;
  }, [facingMode]);

  const startLive = useCallback(async () => {
    try {
      setStatus('preparing');
      setIsFullScreen(true);

      await requestMedia();

      const recorder = new MediaRecorder(mediaStreamRef.current!);
      mediaRecorderRef.current = recorder;
      recorder.start();
      isRecordingRef.current = true;

      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (videoRef.current) {
          const display = videoRef.current.parentElement?.querySelector<HTMLSpanElement>('#live-timer');
          if (display) display.textContent = formatTime(durationRef.current);
        }
      }, 1000);

      setStatus('live');
      toast.success('🔴 You are LIVE');

      if (onStart) await onStart();
    } catch (err) {
      console.error(err);
      toast.error('Failed to start live');
      stopLive();
    }
  }, [requestMedia, onStart]);

  const stopLive = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    setStatus('stopped');
    setIsFullScreen(false);
    durationRef.current = 0;
  }, []);

  const switchCamera = useCallback(async () => {
    if (isRecordingRef.current) return toast.warning('Stop live before switching camera');
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await requestMedia(newMode);
  }, [facingMode, requestMedia]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (isFullScreen && status === 'live') {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
        <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <span id="live-timer" className="bg-red-600 px-3 py-1 rounded-full text-sm font-semibold">
            🔴 LIVE 0:00
          </span>
          <button onClick={() => stopLive()} className="bg-black/60 px-3 py-1 rounded-lg">✕</button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pb-24 md:pb-10 px-6">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 flex justify-around items-center">
            <button onClick={switchCamera} className="px-4 py-2 bg-white/10 rounded-lg">🔄 Camera</button>
            <button onClick={stopLive} className="px-6 py-3 bg-red-600 rounded-full font-bold">END LIVE</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startLive}
      className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg shadow-lg active:scale-95 transition"
    >
      🔴 Go Live
    </button>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
