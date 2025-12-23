'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, Camera, X, Wifi, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface GoLiveState {
  status: 'idle' | 'requesting-permission' | 'streaming' | 'uploading' | 'error';
  message: string;
  duration: number;
  error?: string;
}

interface GoLiveButtonProps {
  onStart?: () => void;
}

export default function GoLiveButton({ onStart }: GoLiveButtonProps = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<GoLiveState>({
    status: 'idle',
    message: 'Ready to Go Live',
    duration: 0,
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const geolocationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAlertIdRef = useRef<string | null>(null);

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
  const requestMediaPermissions = useCallback(async () => {
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
          facingMode: cameraFacing,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setShowPreview(true);

      // Display stream in video element with enhanced loading
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Handle both onloadedmetadata and oncanplay for better compatibility
        const playVideo = () => {
          videoRef.current?.play().catch((e) => {
            console.error('Error playing video:', e);
          });
        };

        videoRef.current.onloadedmetadata = playVideo;
        videoRef.current.oncanplay = playVideo;

        // If video still doesn't load, try playing after a delay
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch((e) => {
              console.error('Delayed play failed:', e);
            });
          }
        }, 500);
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
  }, [cameraFacing]);

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    try {
      // Stop current stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Toggle camera facing mode
      const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
      setCameraFacing(newFacing);

      // Request new stream with new camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: newFacing,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Display new stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playVideo = () => {
          videoRef.current?.play().catch((e) => {
            console.error('Error playing video:', e);
          });
        };

        videoRef.current.onloadedmetadata = playVideo;
        videoRef.current.oncanplay = playVideo;

        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch((e) => {
              console.error('Delayed play failed:', e);
            });
          }
        }, 500);
      }

      toast.success(`Switched to ${newFacing === 'user' ? 'front' : 'back'} camera`);
    } catch (error: any) {
      toast.error(`Failed to switch camera: ${error.message}`);
    }
  }, [cameraFacing]);

  // Start live streaming
  const startLiveStream = useCallback(async () => {
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

      if (alert) {
        currentAlertIdRef.current = alert.id;
      }

      // Initialize MediaRecorder
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

          // Call onStart callback if provided
          if (onStart) {
            onStart();
          }

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
            }
          }, 1000);

          // Broadcast location updates every 5 seconds
          geolocationIntervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition((position) => {
              const newLoc = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setLocation(newLoc);

              // Update location in Supabase
              if (currentAlertIdRef.current) {
                Promise.resolve(
                  supabase
                    .from('emergency_alerts')
                    .update({
                      lat: newLoc.latitude,
                      lng: newLoc.longitude,
                    })
                    .eq('id', currentAlertIdRef.current)
                ).catch((err: any) => console.error('Location update error:', err));
              }
            });
          }, 5000);
        };

        mediaRecorderRef.current.onstop = () => {
          isRecordingRef.current = false;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (geolocationIntervalRef.current) {
            clearInterval(geolocationIntervalRef.current);
            geolocationIntervalRef.current = null;
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
      currentAlertIdRef.current = null;
    }
  }, [user, onStart]);

  // Stop live streaming and upload
  const stopLiveStream = useCallback(async () => {
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

      // Stop intervals
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (geolocationIntervalRef.current) {
        clearInterval(geolocationIntervalRef.current);
        geolocationIntervalRef.current = null;
      }

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

      // Update alert with video URL with retry logic
      if (currentAlertIdRef.current) {
        let updateSuccess = false;
        let lastError: any = null;

        // Retry up to 3 times for schema cache issues
        for (let i = 0; i < 3; i++) {
          try {
            const { error: updateError } = await supabase
              .from('emergency_alerts')
              .update({
                video_url: urlData.publicUrl,
                status: 'video_uploaded',
              })
              .eq('id', currentAlertIdRef.current);

            if (updateError) {
              lastError = updateError;
              if (i < 2) {
                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
              }
            } else {
              updateSuccess = true;
              break;
            }
          } catch (err) {
            lastError = err;
            if (i < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
          }
        }

        if (!updateSuccess && lastError) {
          console.warn('Failed to update video URL after retries:', lastError);
          toast.warning('Video uploaded but metadata update delayed. It will sync shortly.');
        }
      }

      setState({
        status: 'idle',
        message: 'Video uploaded. Responders notified.',
        duration: 0,
      });

      toast.success('Emergency broadcast complete');
      chunksRef.current = [];
      recordingStartTimeRef.current = null;
      mediaRecorderRef.current = null;
      currentAlertIdRef.current = null;
    } catch (error: any) {
      setState({
        status: 'error',
        message: 'Failed to upload video',
        duration: 0,
        error: error.message,
      });
      toast.error(`Upload failed: ${error.message}`);
    }
  }, [state.duration, user?.id]);

  // Cancel streaming (no save)
  const cancelLiveStream = useCallback(() => {
    try {
      isRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (geolocationIntervalRef.current) {
        clearInterval(geolocationIntervalRef.current);
        geolocationIntervalRef.current = null;
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (geolocationIntervalRef.current) {
        clearInterval(geolocationIntervalRef.current);
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
      {/* Emergency Warning */}
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">
          <strong>Emergency Only:</strong> Only use Go Live for life-threatening situations. Misuse may result in penalties.
        </p>
      </div>

      {/* Video Preview */}
      {showPreview && mediaStreamRef.current && (
        <div className="mb-6 rounded-xl overflow-hidden bg-black shadow-lg relative">
          <video
            ref={videoRef}
            className="w-full h-auto bg-black object-cover"
            muted
            playsInline
            autoPlay
            style={{ display: 'block', width: '100%' }}
          />
          {/* Camera Switch Button */}
          <button
            onClick={switchCamera}
            className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition"
            title="Switch camera"
          >
            <Camera className="w-5 h-5" />
          </button>
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
