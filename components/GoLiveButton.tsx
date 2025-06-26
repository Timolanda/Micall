import { useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

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
    setRecording(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera not supported');
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    videoChunks.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunks.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = async () => {
      setUploading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const blob = new Blob(videoChunks.current, { type: 'video/webm' });
      const file = new File([blob], `live-${Date.now()}.webm`, { type: 'video/webm' });
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from('videos').upload(file.name, file);
      setUploading(false);
      setRecording(false);
      if (error) {
        setErrorMsg('Upload failed: ' + error.message + '\n\nMake sure you have a Supabase Storage bucket named "videos" and that your policy allows uploads.');
        /*
        // Supabase SQL to create the bucket and allow authenticated uploads:
        -- In Supabase Storage UI, create a bucket named 'videos'.
        -- Then run this policy:
        insert into storage.buckets (id, name, public) values ('videos', 'videos', false);
        -- Policy example (SQL):
        create policy "Allow authenticated upload to videos" on storage.objects
          for insert using (bucket_id = 'videos' and auth.role() = 'authenticated');
        */
        return;
      }
      // Notify contacts (placeholder)
      await supabase.from('emergency_alerts').insert({
        type: 'video',
        video_url: data?.path,
        created_at: new Date().toISOString(),
        // Add user/location info as needed
      });
      setSuccessMsg('Video uploaded and contacts notified!');
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      mediaRecorderRef.current?.stop();
      stream.getTracks().forEach((track) => track.stop());
    }, 10000); // Record for 10 seconds (adjust as needed)
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="w-32 h-32 rounded-full bg-danger shadow-lg flex items-center justify-center text-white text-2xl animate-pulse-glow border-4 border-danger focus:outline-none focus:ring-4 focus:ring-danger/50"
        onClick={handleClick}
        aria-label="Go Live"
        disabled={recording || uploading}
      >
        {countdown !== null ? countdown : recording ? (uploading ? 'Uploading...' : 'Recording...') : 'Go Live'}
      </button>
      {errorMsg && <div className="text-red-500 text-sm text-center whitespace-pre-line">{errorMsg}</div>}
      {successMsg && <div className="text-green-500 text-sm text-center">{successMsg}</div>}
    </div>
  );
} 