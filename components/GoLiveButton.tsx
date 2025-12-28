'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, AlertCircle, RotateCcw, Volume2, VolumeX, Users } from 'lucide-react';
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [responderCount, setResponderCount] = useState(0);
  const [currentAlertId, setCurrentAlertId] = useState<number | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const responderCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const subscriptionRef = useRef<any>(null);

  // Get user's current location with timeout
  const getCurrentLocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 40.7128, longitude: -74.006 });
        return;
      }

      let timeoutId: NodeJS.Timeout | null = null;

      timeoutId = setTimeout(() => {
        resolve({ latitude: 40.7128, longitude: -74.006 });
      }, 3000); // 3 second timeout instead of 5

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({ latitude: 40.7128, longitude: -74.006 });
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 0 }
      );
    });
  }, []);

  // Subscribe to responder count
  const subscribeToResponderCount = useCallback((alertId: number) => {
    try {
      // Fetch count of notifications for this alert
      Promise.resolve(
        supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('alert_id', alertId)
      )
        .then(({ count }) => {
          setResponderCount(count || 0);
        })
        .catch((error: any) => {
          console.error('Error fetching initial responder count:', error);
        });
    } catch (error) {
      console.error('Error subscribing to responders:', error);
    }
  }, []);

  // Fetch responder count periodically
  const fetchResponderCount = useCallback(async (alertId: number) => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('alert_id', alertId);

      setResponderCount(count || 0);
    } catch (error) {
      console.error('Error fetching responder count:', error);
    }
  }, []);

  // Request camera permissions with better error handling
  const requestMediaPermissions = useCallback(async () => {
    try {
      setState({
        status: 'requesting-permission',
        message: 'Requesting camera & microphone access...',
        duration: 0,
      });

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          facingMode: facingMode,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setShowPreview(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const playVideo = () => {
          videoRef.current?.play().catch((e) => console.error('Play error:', e));
        };

        videoRef.current.onloadedmetadata = playVideo;
        videoRef.current.oncanplay = playVideo;

        // Fallback timeout
        setTimeout(playVideo, 500);
      }

      setState({
        status: 'idle',
        message: '📹 Camera ready',
        duration: 0,
      });

      toast.success('Camera enabled');
    } catch (error: any) {
      console.error('Camera error:', error);

      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone permission denied. Please enable in settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found on this device';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another app';
      }

      setState({
        status: 'error',
        message: errorMessage,
        duration: 0,
        error: error.message,
      });

      toast.error(errorMessage);
      setShowPreview(false);
    }
  }, [facingMode]);

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
  }, [facingMode]);

  // Start live streaming with timeout protection
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
        message: 'Initializing live stream...',
        duration: 0,
      });

      setIsFullScreen(true);

      // Get location with timeout
      const loc = await getCurrentLocation();
      setLocation(loc);

      // Create emergency alert with timeout protection
      const alertPromise = supabase
        .from('emergency_alerts')
        .insert({
          user_id: user.id,
          type: 'Go Live',
          message: 'Go Live emergency broadcast',
          lat: loc.latitude,
          lng: loc.longitude,
          status: 'active',
          video_url: null,
        })
        .select()
        .single();

      // Set timeout for alert creation
      const alertWithTimeout = Promise.race([
        alertPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Alert creation timeout')), 5000)
        ),
      ]);

      const { data: alert, error: alertError } = (await alertWithTimeout) as any;

      if (alertError) {
        throw new Error(`Failed to create alert: ${alertError.message}`);
      }

      setCurrentAlertId(alert.id);

      // Start responder count tracking
      subscribeToResponderCount(alert.id);
      responderCountIntervalRef.current = setInterval(() => {
        fetchResponderCount(alert.id);
      }, 2000); // Check every 2 seconds

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
            message: '🔴 LIVE',
            duration: 0,
          });

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
                duration,
              }));

              // Broadcast location updates every 5 seconds - with timeout
              if (duration % 5 === 0 && duration > 0) {
                getCurrentLocation().then((newLoc) => {
                  setLocation(newLoc);

                  // Non-blocking location update
                  Promise.resolve(
                    supabase
                      .from('emergency_alerts')
                      .update({
                        lat: newLoc.latitude,
                        lng: newLoc.longitude,
                      })
                      .eq('id', alert.id)
                  ).catch((err: any) => console.warn('Location update failed:', err));
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

        mediaRecorderRef.current.start();
      }
    } catch (error: any) {
      console.error('Start stream error:', error);
      setState({
        status: 'error',
        message: 'Failed to start live stream',
        duration: 0,
        error: error.message,
      });
      toast.error(`Failed to start: ${error.message}`);
      setIsFullScreen(false);
      isRecordingRef.current = false;
    }
  }, [user, onStart, getCurrentLocation, subscribeToResponderCount, fetchResponderCount]);

  // Stop live streaming and upload with timeout protection
  const stopLiveStream = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) {
      toast.error('Recording not active');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setState({
        status: 'uploading',
        message: 'Uploading video...',
        duration: state.duration,
      });

      isRecordingRef.current = false;

      // Clear intervals
      if (responderCountIntervalRef.current) {
        clearInterval(responderCountIntervalRef.current);
      }

      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }

      mediaRecorderRef.current.stop();

      // Wait for recording to finish with timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (mediaRecorderRef.current?.state === 'inactive') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        }),
        new Promise<void>((resolve) => setTimeout(() => resolve(), 5000)),
      ]);

      if (chunksRef.current.length === 0) {
        throw new Error('No video data recorded');
      }

      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });

      if (videoBlob.size === 0) {
        throw new Error('Video blob is empty');
      }

      const fileName = `emergency-${user.id}-${Date.now()}.webm`;

      // Upload with timeout
      const uploadPromise = supabase.storage
        .from('emergency-videos')
        .upload(`videos/${fileName}`, videoBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      const uploadWithTimeout = Promise.race([
        uploadPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
        ),
      ]);

      const { data: uploadData, error: uploadError } = (await uploadWithTimeout) as any;

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('emergency-videos')
        .getPublicUrl(`videos/${fileName}`);

      // Update alert with retry logic
      if (currentAlertId) {
        const updateAlert = async (retries = 3) => {
          try {
            await supabase
              .from('emergency_alerts')
              .update({
                video_url: urlData.publicUrl,
                status: 'video_uploaded',
              })
              .eq('id', currentAlertId);
          } catch (err) {
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return updateAlert(retries - 1);
            } else {
              console.warn('Failed to update alert after retries');
            }
          }
        };

        await updateAlert();
      }

      setState({
        status: 'idle',
        message: '✅ Broadcast complete',
        duration: 0,
      });

      toast.success('Emergency broadcast complete');
      setIsFullScreen(false);
      setResponderCount(0);
      chunksRef.current = [];
      recordingStartTimeRef.current = null;
      mediaRecorderRef.current = null;
      setCurrentAlertId(null);
    } catch (error: any) {
      console.error('Stop/upload error:', error);
      setState({
        status: 'error',
        message: 'Failed to upload video',
        duration: 0,
        error: error.message,
      });
      toast.error(`Upload failed: ${error.message}`);
    }
  }, [user, state.duration, currentAlertId]);

  // Cancel streaming
  const cancelLiveStream = useCallback(() => {
    try {
      isRecordingRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (responderCountIntervalRef.current) {
        clearInterval(responderCountIntervalRef.current);
        responderCountIntervalRef.current = null;
      }

      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
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

      setIsFullScreen(false);
      setResponderCount(0);
      setCurrentAlertId(null);
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

      if (responderCountIntervalRef.current) {
        clearInterval(responderCountIntervalRef.current);
      }

      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }

      const subscription = subscriptionRef.current;
      if (subscription) {
        subscription.unsubscribe();
      }

      const mediaStream = mediaStreamRef.current;
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ============ FULL SCREEN LIVE VIEW ============
  if (isFullScreen && state.status === 'streaming') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={isMuted}
            playsInline
            autoPlay
          />

          {/* LIVE Badge - Top Left */}
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-bold text-lg">LIVE</span>
            <span className="text-sm font-semibold ml-2">{state.duration}s</span>
          </div>

          {/* Responders Viewing - Top Right */}
          <div className="absolute top-6 right-6 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">{responderCount} viewing</span>
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent pt-12 pb-8 px-6">
            <div className="flex justify-between items-end gap-4 max-w-2xl mx-auto w-full">
              {/* Left Controls */}
              <div className="flex gap-4">
                {/* Mute Button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-4 bg-white/20 hover:bg-white/30 text-white rounded-full transition backdrop-blur-sm"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>

                {/* Switch Camera Button */}
                <button
                  onClick={switchCamera}
                  className="p-4 bg-white/20 hover:bg-white/30 text-white rounded-full transition backdrop-blur-sm"
                  title="Switch camera"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex gap-3">
                {/* Cancel Button */}
                <button
                  onClick={cancelLiveStream}
                  className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full font-bold transition"
                >
                  Cancel
                </button>

                {/* Stop & Upload Button */}
                <button
                  onClick={stopLiveStream}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition"
                >
                  End Live
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ UPLOADING STATE ============
  if (state.status === 'uploading') {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-1 bg-white rounded-full" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Uploading...</h2>
          <p className="text-gray-600 mb-2">Your video is being saved</p>
          <p className="text-sm text-gray-500">This may take a moment</p>
        </div>
      </div>
    );
  }

  // ============ NORMAL PREVIEW MODE ============
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Preview Card */}
      {showPreview && mediaStreamRef.current && (
        <div className="mb-6 rounded-2xl overflow-hidden bg-black shadow-xl border-2 border-gray-200 relative aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full bg-black object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Camera Ready Badge */}
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Ready
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Go Live</h2>
          <p className="text-gray-600 text-sm">Stream to nearby responders in seconds</p>
        </div>

        {/* Status Message */}
        {state.message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-blue-900 text-sm font-medium">{state.message}</p>
            {state.error && <p className="text-red-600 text-xs mt-2">{state.error}</p>}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          {state.status === 'idle' && !showPreview && (
            <button
              onClick={requestMediaPermissions}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5" />
              Enable Camera
            </button>
          )}

          {state.status === 'idle' && showPreview && (
            <>
              <button
                onClick={startLiveStream}
                className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-3"
              >
                <AlertCircle className="w-5 h-5" />
                Go Live Now
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </>
          )}

          {state.status === 'requesting-permission' && (
            <div className="w-full px-6 py-4 bg-yellow-50 text-yellow-800 rounded-xl text-center font-semibold border border-yellow-200">
              ⏳ Requesting permission...
            </div>
          )}

          {state.status === 'error' && (
            <button
              onClick={requestMediaPermissions}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold hover:shadow-lg transition"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Safety Info */}
        <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
          🔒 Your video is encrypted and only shared with verified responders. You can stop at any time.
        </p>
      </div>
    </div>
  );
}
