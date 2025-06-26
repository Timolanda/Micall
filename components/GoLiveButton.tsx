'use client';
import { useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { VideoIcon, UploadCloud, Loader2 } from 'lucide-react';

export default function GoLiveButton({ onStart }: { onStart: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunks = useRef<Blob[]>([]);

  const handleClick = async () => {
    setCountdown(3);
    setErrorMsg(null);
    setSuccessMsg(null);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === 1) {
          clearInterval(interval);
          setCountdown(null);
          startRecording();
          return null;
        }
        return c! - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    onStart?.();
    setRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      videoChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunks.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setUploading(true);
        const blob = new Blob(videoChunks.current, { type: 'video/webm' });
        const file = new File([blob], `live-${Date.now()}.webm`, { type: 'video/webm' });

        const { data, error } = await supabase.storage.from('videos').upload(file.name, file);
        setRecording(false);
        setUploading(false);

        if (error) {
          setErrorMsg(`Upload failed: ${error.message}\n\nEnsure a Supabase bucket named "videos" with public upload access exists.`);
          return;
        }

        await supabase.from('emergency_alerts').insert({
          type: 'video',
          video_url: data?.path,
          created_at: new Date().toISOString(),
        });

        setSuccessMsg('Live video uploaded and emergency contacts notified!');
      };

      mediaRecorderRef.current.start();

      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        stream.getTracks().forEach((track) => track.stop());
      }, 10000);
    } catch (err) {
      setRecording(false);
      setErrorMsg('Unable to access camera/mic. Please check permissions.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={recording || uploading}
        aria-label="Go Live"
        className={`
          w-32 h-32 rounded-full text-white flex items-center justify-center text-xl font-bold border-4 transition-all duration-300 
          ${countdown !== null ? 'bg-orange-500 border-orange-500' : ''}
          ${recording ? 'bg-red-600 border-red-600 animate-pulse' : ''}
          ${uploading ? 'bg-blue-600 border-blue-600 animate-pulse' : ''}
          ${!recording && countdown === null && !uploading ? 'bg-primary border-primary hover:bg-primary/80' : ''}
          focus:outline-none focus:ring-4 focus:ring-primary/50
        `}
      >
        {countdown !== null ? (
          <span className="text-4xl animate-bounce">{countdown}</span>
        ) : recording ? (
          <VideoIcon className="animate-ping" size={28} />
        ) : uploading ? (
          <UploadCloud className="animate-spin" size={28} />
        ) : (
          'Go Live'
        )}
      </button>

      {errorMsg && (
        <div className="text-red-500 text-center text-sm whitespace-pre-line">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="text-green-500 text-center text-sm">{successMsg}</div>
      )}
    </div>
  );
} 