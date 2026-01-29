'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamicImport from 'next/dynamic';

import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import LoadingIndicator from '../components/LoadingIndicator';
import Modal from '../components/Modal';
import LiveRespondersList from '../components/LiveRespondersList';

import { supabase } from '../utils/supabaseClient';
import { useContacts } from '../hooks/useContacts';
import { useHistory } from '../hooks/useHistory';
import { useAuth } from '../hooks/useAuth';
import { useAlertSound } from '../hooks/useAlertSound';
import { useNativeBridge, type UseNativeBridgeProps } from '../hooks/useNativeBridge';

import {
  Users,
  AlertTriangle,
  MapPin,
  ChevronUp,
  ChevronDown,
  Square,
  Video
} from 'lucide-react';
import { toast } from 'sonner';

// ⚡ PERFORMANCE: Lazy load expensive map component
const ResponderMap = dynamicImport(() => import('../components/ResponderMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
});

// ⚡ PERFORMANCE: Pagination limits
const ALERTS_PAGE_SIZE = 10;
const RESPONDERS_PAGE_SIZE = 20;

type MapState = 'collapsed' | 'expanded';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { playCritical } = useAlertSound();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sosLoading, setSOSLoading] = useState(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [respondersCount, setRespondersCount] = useState(0);
  const [alertId, setAlertId] = useState<string | null>(null);

  const [showSOSModal, setShowSOSModal] = useState(false);
  const [mapState, setMapState] = useState<MapState>('collapsed');
  const [powerButtonReady, setPowerButtonReady] = useState(false);

  const userId = user?.id ?? null;
  useContacts(userId);
  useHistory(userId);

  // ⚡ INTEGRATE POWER BUTTON: Set up native bridge for power button emergency activation
  const { } = useNativeBridge({
    enabled: isAuthenticated && !emergencyActive,
    onPowerButtonPress: async (event) => {
      console.log('📱 Power button pressed:', event);
      // Short press: trigger SOS (emergency mode)
      if (!emergencyActive && !event.isLongPress) {
        console.log('🆘 Power button short press - triggering SOS');
        toast.info('📱 Power button pressed - Activating SOS');
        await handleGoLive(); // Activate go live when power button pressed
      }
    },
    onLongPress: async (event) => {
      console.log('📱 Power button long pressed:', event);
      // Long press: show confirmation modal
      if (!emergencyActive) {
        console.log('🆘 Power button long press - showing SOS modal');
        setShowSOSModal(true);
      }
    },
  });

  useEffect(() => {
    setPowerButtonReady(true);
  }, [isAuthenticated]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthChecked(true);
      if (!data.user) {
        router.replace('/landing');
      } else {
        setIsAuthenticated(true);
      }
    });
  }, [router]);

  /* ---------------- LOCATION ---------------- */
  useEffect(() => {
    if (!isAuthenticated) return;

    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error('Location permission required'),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isAuthenticated]);

  /* ---------------- RESPONDERS AVAILABLE COUNT ---------------- */
useEffect(() => {
  if (!isAuthenticated) return;

  let isMounted = true;

  const fetchResponders = async () => {
    // Count responders with available=true status
    const { data, error } = await supabase
      .from('responders')
      .select('id')
      .eq('available', true);

    if (!error && isMounted) {
      setRespondersCount(data?.length ?? 0);
    }
  };

  fetchResponders();

  // Subscribe to responder availability changes
  const channel = supabase
    .channel('responders-availability')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'responders' },
      () => {
        fetchResponders();
      }
    )
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}, [isAuthenticated]);

  /* ---------------- ACTIVE RESPONDERS ON CURRENT ALERT (IF LIVE) ---------------- */
  useEffect(() => {
    if (!emergencyActive || !alertId) return;

    let isMounted = true;

    const fetchActiveResponders = async () => {
      const { data, error } = await supabase
        .from('responder_presence')
        .select('user_id')
        .eq('alert_id', Number(alertId))
        .eq('user_type', 'responder');

      if (!error && isMounted) {
        // Count responders on this specific alert
        const count = data?.length ?? 0;
        console.log(`Active responders on alert ${alertId}: ${count}`);
        // Could set a separate state here if needed for UI display
      }
    };

    fetchActiveResponders();

    // Subscribe to responder presence changes for this alert
    const channel = supabase
      .channel(`alert-${alertId}-responders`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responder_presence',
          filter: `alert_id=eq.${alertId}`,
        },
        () => {
          fetchActiveResponders();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [emergencyActive, alertId]);

  /* ---------------- CAMERA PERMISSION CHECK & SETUP ---------------- */
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const permissions = await navigator.permissions?.query?.({ name: 'camera' });
      if (permissions?.state === 'denied') {
        toast.error('Camera permission denied. Please enable in settings.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Could not check camera permission:', err);
      return true; // Proceed anyway on unsupported browsers
    }
  };

  /* ---------------- CAMERA SETUP WITH PROPER CONSTRAINTS & ERROR HANDLING ---------------- */
  const startCamera = async () => {
    try {
      console.log('📹 Attempting to start camera...');
      
      // Check permission first on mobile
      try {
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          const hasPermission = await checkCameraPermission();
          if (!hasPermission) {
            throw new Error('Camera permission denied');
          }
        }
      } catch (permErr) {
        console.warn('⚠️ Could not check permissions:', permErr);
      }

      const videoConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      let stream: MediaStream | null = null;

      // Attempt 1: Try with audio + video
      try {
        console.log('🎤 Attempting getUserMedia with audio + video...');
        stream = await navigator.mediaDevices.getUserMedia({
          ...videoConstraints,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        console.log('✅ Stream acquired with audio + video');
      } catch (audioErr) {
        console.warn('⚠️ Audio failed, attempting video-only:', audioErr);
        // Attempt 2: Try video only
        try {
          stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
          console.log('✅ Stream acquired with video only');
        } catch (videoErr) {
          console.error('❌ Video-only also failed:', videoErr);
          throw videoErr;
        }
      }

      if (!stream) {
        throw new Error('Failed to get media stream');
      }

      mediaStreamRef.current = stream;
      console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

      if (!videoRef.current) {
        throw new Error('Video element not found in DOM');
      }

      videoRef.current.srcObject = stream;

      // Wait for metadata and play with proper error handling
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video ref lost'));
          return;
        }

        const onLoadedMetadata = async () => {
          try {
            console.log('📹 Video metadata loaded, attempting to play...');
            if (videoRef.current) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
                console.log('✅ Video playing successfully');
              }
            }
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          } catch (playErr) {
            console.error('❌ Play error:', playErr);
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            reject(playErr);
          }
        };

        const timeoutId = setTimeout(() => {
          console.error('❌ Metadata load timeout');
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
          reject(new Error('Video metadata failed to load'));
        }, 5000);

        videoRef.current.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId);
          onLoadedMetadata();
        });

        // Fallback: try playing even if metadata hasn't loaded
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            videoRef.current.play().catch(err => console.warn('Fallback play attempt:', err));
          }
        }, 1000);
      });

      console.log('✅ Camera started successfully');
      toast.success('📹 Camera ready');
    } catch (err) {
      console.error('❌ Camera start failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
        toast.error('📹 Camera permission denied. Enable in browser settings.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('no suitable cameras')) {
        toast.error('📹 No camera found. Check your device.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('in use')) {
        toast.error('📹 Camera in use. Close other apps and try again.');
      } else if (errorMsg.includes('AbortError')) {
        toast.error('📹 Camera access aborted.');
      } else if (errorMsg.includes('metadata') || errorMsg.includes('timeout')) {
        toast.error('📹 Camera metadata failed to load. Restart the app.');
      } else {
        toast.error(`📹 Camera error: ${errorMsg}`);
      }

      // Don't throw - alert can still be active without camera
      console.warn('⚠️ Camera unavailable, but alert is active (audio-only)');
    }
  };

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
      console.log('🛑 Stopped track:', track.kind);
    });
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /* ---------------- GO LIVE ---------------- */
  const handleGoLive = async (): Promise<string | null> => {
    if (!userLocation) {
      toast.warning('Enable location services first.');
      return null;
    }

    setLoading(true);

    try {
      // 1️⃣ Ensure user is authenticated
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      if (authError || !uid) {
        console.error('Auth error:', authError);
        throw new Error('User not authenticated');
      }

      console.log('Creating alert for user:', uid, 'Location:', userLocation);

      // 2️⃣ Create emergency alert (responder_presence will track viewers)
      const { data: alertData, error: alertError } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: uid,
          type: 'video',
          lat: userLocation[0],
          lng: userLocation[1],
          status: 'active',
          message: 'Go Live activated',
        })
        .select('id')
        .single();

      if (alertError) {
        console.error('Alert creation error:', alertError);
        throw alertError ?? new Error('Failed to create alert');
      }

      if (!alertData?.id) {
        console.error('Alert data missing ID:', alertData);
        throw new Error('Alert created but ID not returned');
      }

      const alertId = String(alertData.id);
      console.log('Alert created successfully:', alertId);

      // 3️⃣ Insert victim into responder_presence (so responders can see they're viewing)
      const { error: presenceError } = await supabase
        .from('responder_presence')
        .upsert(
          {
            user_id: uid,
            alert_id: Number(alertId),
            user_type: 'victim',
            lat: userLocation[0],
            lng: userLocation[1],
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,alert_id' }
        );

      if (presenceError) {
        console.error('Presence insertion error:', presenceError);
        // Don't throw - alert already created
      }

      setEmergencyActive(true);
      setAlertId(alertId);

      // Start camera BEFORE playing sound (audio can block camera on some devices)
      try {
        await startCamera();
      } catch (cameraErr) {
        console.error('Failed to start camera:', cameraErr);
        // Don't fail the entire go live - camera is optional, alert is critical
        toast.warning('⚠️ Camera failed to start, but alert is live. Check camera permissions.');
      }

      toast.success('🔴 You are now live');

      // Play critical alert sound to notify responders (after camera is ready)
      await playCritical(5).catch((err) => {
        console.debug('Alert sound play failed:', err);
      });

      return alertId;
    } catch (err) {
      console.error('Go Live error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to go live';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- END LIVE ---------------- */
  const handleEndLive = async () => {
    if (!alertId || !user?.id) return;

    try {
      const alertIdNum = Number(alertId);

      // 1️⃣ Update alert status
      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .update({ status: 'ended', updated_at: new Date().toISOString() })
        .eq('id', alertIdNum);

      if (alertError) {
        console.error('Alert update error:', alertError);
        // Non-critical, continue cleanup
      }

      // 2️⃣ Remove from responder_presence
      const { error: presenceError } = await supabase
        .from('responder_presence')
        .delete()
        .eq('user_id', user.id)
        .eq('alert_id', alertIdNum);

      if (presenceError) {
        console.error('Presence cleanup error:', presenceError);
        // Non-critical
      }

      // 3️⃣ Remove from live_responders if applicable
      const { error: liveError } = await supabase
        .from('live_responders')
        .delete()
        .eq('alert_id', alertIdNum)
        .eq('responder_id', user.id);

      if (liveError) {
        console.error('Live responder cleanup error:', liveError);
        // Non-critical
      }

      // 4️⃣ Stop media and clear state
      stopCamera();
      setEmergencyActive(false);
      setAlertId(null);
      setMapState('collapsed');

      toast.success('Live ended');
    } catch (err) {
      console.error('End live error:', err);
      toast.error('Error ending live');
    }
  };

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* FULLSCREEN CAMERA OVERLAY */}
      {emergencyActive && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <button
              onClick={handleEndLive}
              className="bg-red-700 px-5 py-3 rounded-xl flex items-center gap-2"
            >
              <Square size={16} /> End Live
            </button>
          </div>
          {/* LIVE RESPONDERS LIST - INSTAGRAM STYLE */}
          <LiveRespondersList alertId={alertId} />
        </div>
      )}

      {/* DASHBOARD */}
      <div className="max-w-4xl mx-auto p-6 pt-20 pb-96">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 p-6 rounded-xl flex flex-col items-center">
            <GoLiveButton onStart={handleGoLive} alertId={alertId} />
            <h3 className="mt-4 font-semibold flex gap-2">
              <Video /> Go Live
            </h3>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl flex flex-col items-center">
            <SOSButton onSOS={() => setShowSOSModal(true)} />
            <h3 className="mt-4 font-semibold">SOS</h3>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl flex flex-col items-center">
            <Users />
            <div className="text-2xl font-bold">{respondersCount}</div>
            <p className="text-sm text-zinc-400">Responders Available</p>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE MAP — FIXED ABOVE NAV */}
      <div
        className={`fixed left-0 right-0 z-40 bg-zinc-900 border-t border-white/10 transition-all`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 64px)',
          height: mapState === 'collapsed' ? '120px' : '380px',
        }}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
            <div className="flex gap-2 items-center">
              <MapPin size={18} />
              <h2 className="font-semibold text-sm">Live Response Map</h2>
            </div>

            <button
              onClick={() =>
                setMapState(mapState === 'collapsed' ? 'expanded' : 'collapsed')
              }
              className="p-1 hover:bg-white/10 rounded transition"
              aria-label="Toggle map"
            >
              {mapState === 'collapsed' ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </div>

          {mapState === 'expanded' && userLocation && (
            <div className="flex-1 rounded overflow-hidden">
              <ResponderMap
                responder={{ lat: userLocation[0], lng: userLocation[1] }}
                victim={{ lat: userLocation[0], lng: userLocation[1] }}
                onClose={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {showSOSModal && (
        <Modal onClose={() => setShowSOSModal(false)}>
          <h2 className="font-bold mb-4">Emergency Type</h2>
          {['Health', 'Assault', 'Fire', 'Accident', 'Other'].map((t) => (
            <button
              key={t}
              className="w-full bg-red-600 py-3 rounded mb-2"
              onClick={() => setShowSOSModal(false)}
            >
              {t}
            </button>
          ))}
        </Modal>
      )}
    </div>
  );
}
