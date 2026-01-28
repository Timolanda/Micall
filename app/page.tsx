'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import LoadingIndicator from '../components/LoadingIndicator';
import Modal from '../components/Modal';

import { supabase } from '../utils/supabaseClient';
import { useContacts } from '../hooks/useContacts';
import { useHistory } from '../hooks/useHistory';
import { useAuth } from '../hooks/useAuth';
import { useAlertSound } from '../hooks/useAlertSound';

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

const ResponderMap = dynamic(() => import('../components/ResponderMap'), {
  ssr: false,
});

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

  const userId = user?.id ?? null;
  useContacts(userId);
  useHistory(userId);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/landing');
      else setIsAuthenticated(true);
      setAuthChecked(true);
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

  /* ---------------- CAMERA ---------------- */
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    });

    mediaStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
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

      // 2️⃣ Ensure responder row exists (UPSERT first to avoid FK constraint)
      const { error: responderError } = await supabase
        .from('responders')
        .upsert(
          {
            id: uid,
            latitude: userLocation[0],
            longitude: userLocation[1],
            available: false, // Not "available" yet, they're in emergency mode
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (responderError) {
        console.error('Responder setup error:', responderError);
        throw new Error('Failed to set up responder tracking: ' + responderError.message);
      }

      // 3️⃣ Create emergency alert
      const { data: alertData, error: alertError } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: uid,
          type: 'video',
          latitude: userLocation[0],
          longitude: userLocation[1],
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

      // 4️⃣ Insert victim into responder_presence (so responders can see they're viewing)
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
      toast.success('🔴 You are now live');

      // Play critical alert sound to notify responders
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
