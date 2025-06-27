'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { VideoIcon, UploadCloud, Loader2, Square } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

export default function GoLiveButton({ onStart }: { onStart: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunks = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user info
  const { user } = useAuth();
  const { profile } = useProfile(user?.id || null);

  // Get user location
  const getLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  };

  const handleClick = async () => {
    setCountdown(3);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAlertId(null);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === 1) {
          clearInterval(interval);
          setCountdown(null);
          startWorkflow();
          return null;
        }
        return c! - 1;
      });
    }, 1000);
  };

  // Attach stream to video element when both are ready
  useEffect(() => {
    if (recording && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
    // Clean up srcObject when not recording
    if (!recording && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [recording]);

  // Full workflow: alert, then record
  const startWorkflow = async () => {
    onStart?.();
    setRecording(true);
    setIsStopping(false);

    // 1. Get location
    const location = await getLocation();

    // 2. Create emergency alert immediately
    let alertIdCreated: number | null = null;
    if (user?.id) {
      const { data, error } = await supabase.from('emergency_alerts').insert({
        user_id: user.id,
        type: 'video',
        status: 'active',
        lat: location?.lat,
        lng: location?.lng,
        message: `Live video started by ${profile?.name || 'user'}`,
        created_at: new Date().toISOString(),
      }).select('id').single();
      if (error) {
        setErrorMsg('Failed to create emergency alert: ' + error.message);
        setRecording(false);
        return;
      }
      alertIdCreated = data?.id;
      setAlertId(alertIdCreated);
    }

    // 3. Start camera and recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      videoChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunks.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setUploading(true);
        setIsStopping(false);
        const blob = new Blob(videoChunks.current, { type: 'video/webm' });
        const file = new File([blob], `live-${Date.now()}.webm`, { type: 'video/webm' });

        // Stop the video preview and release the camera
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        try {
          const { data, error } = await supabase.storage.from('videos').upload(file.name, file);
          setRecording(false);
          setUploading(false);

          if (error) {
            setErrorMsg('Upload failed: ' + error.message);
            return;
          }

          // 4. Update emergency alert with video URL
          if (alertIdCreated) {
            const { error: updateError } = await supabase.from('emergency_alerts').update({
              video_url: data?.path,
              status: 'video_uploaded',
            }).eq('id', alertIdCreated);
            if (updateError) {
              setErrorMsg('Video uploaded but failed to update alert: ' + updateError.message);
              return;
            }
          }

          setSuccessMsg('Live video uploaded and emergency contacts notified!');
        } catch (err: any) {
          setRecording(false);
          setUploading(false);
          setErrorMsg('Unexpected error: ' + (err.message || 'Unknown error occurred'));
        }
      };

      mediaRecorderRef.current.start();

      // Set a max recording timeout (e.g., 10s)
      stopTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      setRecording(false);
      setErrorMsg('Unable to access camera/mic. Please check permissions.');
    }
  };

  // Stop recording handler
  const stopRecording = () => {
    setIsStopping(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
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

      {/* Camera preview while recording */}
      {recording && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-40 rounded-lg border-2 border-primary shadow-lg mt-2 object-cover"
            style={{ background: '#222' }}
          />
          <button
            onClick={stopRecording}
            disabled={isStopping || uploading}
            className="mt-3 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-60"
          >
            <Square size={18} /> Stop Recording
          </button>
        </>
      )}

      {errorMsg && (
        <div className="text-red-500 text-center text-sm whitespace-pre-line">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="text-green-500 text-center text-sm">{successMsg}</div>
      )}
    </div>
  );
} 