'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { VideoIcon, UploadCloud, Square } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'sonner';

export default function GoLiveButton({ onStart }: { onStart: () => void }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunks = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const { user } = useAuth();
  const { profile } = useProfile(user?.id || null);

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
    setErrorMsg(null);
    setSuccessMsg(null);
    setAlertId(null);
    startWorkflow();
  };

  useEffect(() => {
    if (recording && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
    if (!recording && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [recording]);

  const startWorkflow = async () => {
    onStart?.();
    setRecording(true);
    setIsStopping(false);
    setStreamDuration(0);
    recordingStartTimeRef.current = Date.now();

    const location = await getLocation();
    if (!location) {
      toast.warning('Location unavailable. Sharing last known coordinates only.');
    }

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
        toast.error('Failed to create emergency alert');
        setRecording(false);
        return;
      }
      alertIdCreated = data?.id;
      setAlertId(alertIdCreated);
    }

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

        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        try {
          const { data, error } = await supabase.storage.from('videos').upload(file.name, file);
          setRecording(false);
          setUploading(false);

          if (error) {
            setErrorMsg('Upload failed: ' + error.message);
            toast.error('Live video upload failed');
            return;
          }

          if (alertIdCreated) {
            const { error: updateError } = await supabase.from('emergency_alerts').update({
              video_url: data?.path,
              status: 'video_uploaded',
            }).eq('id', alertIdCreated);
            if (updateError) {
              setErrorMsg('Video uploaded but failed to update alert: ' + updateError.message);
              toast.error('Alert update failed after upload');
              return;
            }
          }

          setSuccessMsg('Live video uploaded and emergency contacts notified!');
          toast.success('Live video uploaded; responders notified');
        } catch (err: any) {
          setRecording(false);
          setUploading(false);
          setErrorMsg('Unexpected error: ' + (err.message || 'Unknown error occurred'));
          toast.error('Unexpected error during upload');
        }
      };

      mediaRecorderRef.current.start();

      if (alertIdCreated) {
        locationIntervalRef.current = setInterval(async () => {
          const newLocation = await getLocation();
          if (newLocation && alertIdCreated) {
            try {
              await supabase
                .from('emergency_alerts')
                .update({
                  lat: newLocation.lat,
                  lng: newLocation.lng,
                })
                .eq('id', alertIdCreated);
            } catch (err) {
              console.error('Error updating location:', err);
            }
          }
        }, 5000);
      }

      timerIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setStreamDuration(duration);
        }
      }, 1000);

      stopTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 600000);
    } catch (err: any) {
      setRecording(false);
      setErrorMsg('Unable to access camera/mic. Please check permissions.');
      toast.error('Camera/Mic access denied');
    }
  };

  const stopRecording = () => {
    setIsStopping(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
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
          ${recording ? 'bg-red-600 border-red-600 animate-pulse' : ''}
          ${uploading ? 'bg-blue-600 border-blue-600 animate-pulse' : ''}
          ${!recording && !uploading ? 'bg-primary border-primary hover:bg-primary/80' : ''}
          focus:outline-none focus:ring-4 focus:ring-primary/50
        `}
      >
        {recording ? (
          <div className="flex flex-col items-center gap-1">
            <VideoIcon className="animate-ping" size={28} />
            <span className="text-xs">{streamDuration}s</span>
          </div>
        ) : uploading ? (
          <UploadCloud className="animate-spin" size={28} />
        ) : (
          'Go Live'
        )}
      </button>

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
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span>🔴 LIVE ({streamDuration}s)</span>
            </div>
            <button
              onClick={stopRecording}
              disabled={isStopping || uploading}
              className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-60"
            >
              <Square size={18} /> Stop Recording
            </button>
          </div>
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
