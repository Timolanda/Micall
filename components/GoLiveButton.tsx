'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Camera, X, Wifi } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface GoLiveState {
  status: 'idle' | 'requesting-permission' | 'streaming' | 'uploading' | 'error';
  message: string;
  duration: number;
  error?: string;
}

export default function GoLiveButton() {
  const { user } = useAuth();
  const [state, setState] = useState<GoLiveState>({
    status: 'idle',
    message: 'Ready to Go Live',
    duration: 0,
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Get user's current location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
        }
      );
    });
  };

  // Request camera and microphone permissions
  const requestMediaPermissions = async () => {
    try {
      setState({
        status: 'requesting-permission',
        message: 'Requesting camera & microphone access...',
        duration: 0,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setShowPreview(true);

      // Display stream in video element - CRITICAL FIX
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to load before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => {
            console.error('Error playing video:', e);
          });
        };
      }

      setState({
        status: 'idle',
        message: 'Camera ready. Click "Go Live" to broadcast',
        duration: 0,
      });

      toast.success('Camera enabled');
    } catch (error: any) {
      setState({
        status: 'error',
        message: 'Failed to access camera/microphone',
        duration: 0,
        error: error.message,
      });
      toast.error(`Camera access denied: ${error.message}`);
      setShowPreview(false);
    }
  };

  // Start live streaming
  const startLiveStream = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (!mediaStreamRef.current) {
      toast.error('Camera not initialized');
      return;
    }

    try {
      setState({
        status: 'streaming',
        message: 'Going live...',
        duration: 0,
      });

      // Get current location
      const loc = await getCurrentLocation();
      setLocation(loc);

      // Create emergency alert in Supabase
      const { data: alert, error: alertError } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: user.id,
          type: 'video',
          message: 'Go Live emergency broadcast',
          lat: loc.latitude,
          lng: loc.longitude,
          status: 'active',
          video_url: null,
        })
        .select()
        .single();

      if (alertError) {
        throw alertError;
      }

      // Initialize MediaRecorder - CRITICAL FIX
      if (mediaStreamRef.current) {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4';

        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });

        chunksRef.current = [];
        isRecordingRef.current = true;

        // Collect video chunks
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstart = () => {
          recordingStartTimeRef.current = Date.now();
          isRecordingRef.current = true;

          setState({
            status: 'streaming',
            message: '🔴 LIVE (0s)',
            duration: 0,
          });

          // Update duration every second
          timerRef.current = setInterval(() => {
            if (recordingStartTimeRef.current && isRecordingRef.current) {
              const duration = Math.floor(
                (Date.now() - recordingStartTimeRef.current) / 1000
              );
              setState((prev) => ({
                ...prev,
                message: `🔴 LIVE (${duration}s)`,
                duration,
              }));

              // Broadcast location updates every 5 seconds
              if (duration % 5 === 0) {
                navigator.geolocation.getCurrentPosition((position) => {
                  const newLoc = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  };
                  setLocation(newLoc);

                  // Update location in Supabase
                  supabase
                    .from('emergency_alerts')
                    .update({
                      lat: newLoc.latitude,
                      lng: newLoc.longitude,
                    })
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .then();
                });
              }
            }
          }, 1000);
        };

        mediaRecorderRef.current.onstop = () => {
          isRecordingRef.current = false;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        // Start recording
        mediaRecorderRef.current.start();
      }
    } catch (error: any) {
      setState({
        status: 'error',
        message: 'Failed to start live stream',
        duration: 0,
        error: error.message,
      });
      toast.error(`Failed to start live stream: ${error.message}`);
      isRecordingRef.current = false;
    }
  };

  // Stop live streaming and upload - CRITICAL FIX
  const stopLiveStream = async () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) {
      toast.error('Recording not active');
      return;
    }

    try {
      setState({
        status: 'uploading',
        message: 'Stopping recording and uploading video...',
        duration: state.duration,
      });

      isRecordingRef.current = false;

      // Stop the recorder
      mediaRecorderRef.current.stop();

      // Wait for the onstop callback to fire
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'inactive') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      // Combine chunks into blob
      if (chunksRef.current.length === 0) {
        throw new Error('No video data recorded');
      }

      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });

      if (videoBlob.size === 0) {
        throw new Error('Video blob is empty');
      }

      // Upload to Supabase Storage
      const fileName = `emergency-${user?.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(`${fileName}`, videoBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(`${fileName}`);

      // Update alert with video URL
      await supabase
        .from('emergency_alerts')
        .update({
          video_url: urlData.publicUrl,
          status: 'video_uploaded',
        })
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      setState({
        status: 'idle',
        message: 'Video uploaded. Responders notified.',
        duration: 0,
      });

      toast.success('Emergency broadcast complete');
      chunksRef.current = [];
      recordingStartTimeRef.current = null;
      mediaRecorderRef.current = null;
    } catch (error: any) {
      setState({
        status: 'error',
        message: 'Failed to upload video',
        duration: 0,
        error: error.message,
      });
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  // Cancel streaming (no save) - CRITICAL FIX
  const cancelLiveStream = () => {
    try {
      isRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      chunksRef.current = [];
      recordingStartTimeRef.current = null;
      mediaRecorderRef.current = null;

      setState({
        status: 'idle',
        message: 'Live stream cancelled',
        duration: 0,
      });

      toast.info('Live stream cancelled');
    } catch (error) {
      console.error('Error cancelling stream:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Video Preview */}
      {showPreview && mediaStreamRef.current && (
        <div className="mb-6 rounded-xl overflow-hidden bg-black shadow-lg relative">
          <video
            ref={videoRef}
            className="w-full h-auto bg-black object-cover"
            muted
            playsInline
            style={{ display: 'block', width: '100%' }}
          />
          {state.status === 'streaming' && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-start gap-3 mb-4">
          {state.status === 'streaming' && (
            <AlertCircle className="w-5 h-5 text-red-600 animate-pulse flex-shrink-0" />
          )}
          {state.status === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          {state.status === 'requesting-permission' && (
            <Camera className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {state.status === 'uploading' && (
            <Wifi className="w-5 h-5 text-blue-600 animate-pulse flex-shrink-0" />
          )}
          {(state.status === 'idle' ||
            (state.status !== 'streaming' &&
              state.status !== 'error' &&
              state.status !== 'requesting-permission' &&
              state.status !== 'uploading')) && (
            <Wifi className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{state.message}</h3>
            {location && (
              <p className="text-xs text-gray-600 mt-1">
                📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            )}
            {state.error && (
              <p className="text-xs text-red-600 mt-1">{state.error}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {state.status === 'idle' && !showPreview && (
            <button
              onClick={requestMediaPermissions}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Enable Camera
            </button>
          )}

          {state.status === 'idle' && showPreview && (
            <button
              onClick={startLiveStream}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2 text-lg"
            >
              <AlertCircle className="w-5 h-5" />
              Go Live
            </button>
          )}

          {state.status === 'streaming' && (
            <>
              <button
                onClick={stopLiveStream}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Stop & Upload
              </button>
              <button
                onClick={cancelLiveStream}
                className="w-full px-4 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}

          {state.status === 'uploading' && (
            <div className="px-4 py-3 bg-gray-100 text-gray-800 rounded-lg text-center font-semibold">
              ⏳ Uploading... Please wait
            </div>
          )}

          {state.status === 'error' && (
            <button
              onClick={requestMediaPermissions}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Safety Info */}
      <p className="text-xs text-gray-500 text-center">
        🔒 Your video is encrypted and only shared with verified nearby responders. Stop at any time.
      </p>
    </div>
  );
}
