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

  /* ---------------- RESPONDERS ---------------- */
useEffect(() => {
  if (!isAuthenticated) return;

  let isMounted = true;

  const fetchResponders = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'responder')
      .in('status', ['available', 'on_duty']);

    if (!error && isMounted) {
      setRespondersCount(data?.length ?? 0);
    }
  };

  fetchResponders();

  const channel = supabase
    .channel('responders-status')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        fetchResponders();
      }
    )
    .subscribe();

  // ✅ CLEANUP MUST BE SYNC
  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}, [isAuthenticated]);

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
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;

    if (!uid) {
      throw new Error('User not authenticated');
    }

    const { data: alertData, error } = await supabase
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

    if (error || !alertData?.id) {
      throw error ?? new Error('Failed to create alert');
    }

    setEmergencyActive(true);
    setAlertId(String(alertData.id)); // ✅ force string
    toast.success('You are now live.');

    return String(alertData.id); // ✅ ALWAYS string
  } catch (err) {
    console.error(err);
    toast.error('Failed to go live');
    return null; // ✅ NEVER undefined
  } finally {
    setLoading(false);
  }
};

  /* ---------------- END LIVE ---------------- */
  const handleEndLive = async () => {
    if (!alertId) return;

    await supabase
      .from('emergency_alerts')
      .update({ status: 'ended' })
      .eq('id', alertId);

    stopCamera();
    setEmergencyActive(false);
    setAlertId(null);
    setMapState('collapsed');
  };

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-[22rem]">
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
      <div className="max-w-4xl mx-auto p-6 pt-20">
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

      {/* COLLAPSIBLE MAP — FIXED NAV OVERLAP */}
      <div
        className={`fixed left-0 right-0 z-40 bg-zinc-900 border-t border-white/10 transition-all
          ${mapState === 'collapsed' ? 'h-24' : 'h-72'}
        `}
        style={{
          bottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-4xl mx-auto p-4 h-full pb-20">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <MapPin />
              <h2 className="font-semibold">Live Response Map</h2>
            </div>

            <button
              onClick={() =>
                setMapState(mapState === 'collapsed' ? 'expanded' : 'collapsed')
              }
            >
              {mapState === 'collapsed' ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>

          {mapState === 'expanded' && userLocation && (
            <div className="mt-2 h-full rounded overflow-hidden">
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
