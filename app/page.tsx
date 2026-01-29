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
      console.log('📹 Starting camera...');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support camera');
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

      try {
        console.log('🎤 Trying audio + video...');
        stream = await navigator.mediaDevices.getUserMedia({
          ...videoConstraints,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (audioErr) {
        console.warn('⚠️ Audio failed, trying video-only');
        stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      }

      if (!stream) throw new Error('No stream');

      mediaStreamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('Video element not found');
      }

      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ Metadata timeout');
          videoRef.current?.play().then(() => resolve()).catch(reject);
        }, 3000);

        const cleanup = () => {
          clearTimeout(timeout);
          videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };

        const handleLoadedMetadata = async () => {
          cleanup();
          try {
            await videoRef.current?.play();
            resolve();
          } catch (e) {
            reject(e);
          }
        };

        videoRef.current?.addEventListener('loadedmetadata', handleLoadedMetadata);
      });

      console.log('✅ Camera ready');
    } catch (err) {
      console.error('❌ Camera error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown';

      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        toast.error('📹 Permission denied - Enable in settings');
      } else if (msg.includes('NotFound')) {
        toast.error('📹 No camera found');
      } else if (msg.includes('NotReadable') || msg.includes('in use')) {
        toast.error('📹 Camera in use');
      } else if (msg.includes('does not support')) {
        toast.error('📹 Browser unsupported');
      } else {
        toast.error(`📹 Error: ${msg}`);
      }

      throw err;
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
    try {
      setLoading(true);

      // ✅ FIX 1: Ensure we have location
      if (!userLocation) {
        toast.error('📍 Waiting for location... Enable location services');
        setLoading(false);
        return null;
      }

      const [lat, lng] = userLocation;

      // ✅ FIX 2: Validate coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        toast.error('📍 Invalid location coordinates');
        setLoading(false);
        return null;
      }

      // ✅ FIX 3: Get authenticated user
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      if (!uid) {
        toast.error('👤 Not authenticated');
        setLoading(false);
        return null;
      }

      console.log('📍 Creating alert:', { lat, lng, uid });

      // ✅ FIX 4: Create emergency alert with proper columns
      const { data: alertData, error: alertError } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: uid,
          status: 'active',
          lat,
          lng,
          type: 'video',
          message: 'Go Live activated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (alertError) {
        console.error('❌ Alert error:', alertError);
        if (alertError.message?.includes('permission')) {
          toast.error('🚨 Permission denied: Check RLS');
        } else if (alertError.message?.includes('connection')) {
          toast.error('🚨 Connection failed');
        } else {
          toast.error(`🚨 Alert failed: ${alertError.message}`);
        }
        setLoading(false);
        return null;
      }

      if (!alertData?.id) {
        toast.error('🚨 No alert ID returned');
        setLoading(false);
        return null;
      }

      const alertId = String(alertData.id);
      console.log('✅ Alert created:', alertId);
      setAlertId(alertId);
      setEmergencyActive(true);

      // ✅ FIX 5: Insert responder presence (non-fatal if fails)
      try {
        const { error: presenceError } = await supabase
          .from('responder_presence')
          .insert({
            alert_id: Number(alertId),
            user_id: uid,
            user_type: 'victim',
            lat,
            lng,
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (presenceError) {
          console.warn('⚠️ Presence error:', presenceError);
        }
      } catch (err) {
        console.warn('⚠️ Presence failed:', err);
      }

      // ✅ FIX 6: Start camera
      try {
        await startCamera();
      } catch (cameraErr) {
        console.error('⚠️ Camera failed:', cameraErr);
        toast.warning('⚠️ Camera unavailable, audio-only');
      }

      toast.success('🎥 Go Live started!');
      await playCritical().catch(e => console.debug('Sound:', e));

      setLoading(false);
      return alertId;
    } catch (err) {
      console.error('❌ Error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown';
      toast.error(`🚨 Failed: ${msg}`);
      setLoading(false);
      setEmergencyActive(false);
      return null;
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
