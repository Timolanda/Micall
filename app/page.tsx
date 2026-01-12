'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import ResponderMap from '../components/ResponderMap';
import LoadingIndicator from '../components/LoadingIndicator';
import Modal from '../components/Modal';

import { supabase } from '../utils/supabaseClient';
import { useContacts } from '../hooks/useContacts';
import { useHistory } from '../hooks/useHistory';
import { useAuth } from '../hooks/useAuth';

import { Users, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sosLoading, setSOSLoading] = useState(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [respondersCount, setRespondersCount] = useState(0);
  const [alertId, setAlertId] = useState<string | null>(null);

  const [showSOSModal, setShowSOSModal] = useState(false);

  const userId = user?.id ?? null;
  useContacts(userId); // retained for side-effects / future UI
  useHistory(userId);

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          setAuthChecked(true);
          router.replace('/landing');
          return;
        }

        setIsAuthenticated(true);
        setAuthChecked(true);
      } catch (err) {
        console.error('Auth check failed', err);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  /* ---------------- GEOLOCATION ---------------- */
  useEffect(() => {
    if (!isAuthenticated || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAuthenticated]);

  /* ---------------- RESPONDER COUNT ---------------- */
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchResponders = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'responder')
        .in('status', ['available', 'on_duty']);

      if (!error) setRespondersCount(data?.length ?? 0);
    };

    fetchResponders();

    const channel = supabase
      .channel('responders-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        fetchResponders
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  /* ---------------- GO LIVE ---------------- */
  const handleGoLive = async () => {
    if (!userLocation) {
      toast.warning('Enable location services first.');
      return null;
    }

    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;

      if (!uid) throw new Error('User not found');

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
        .select()
        .single();

      if (error) throw error;

      setEmergencyActive(true);
      setAlertId(alertData.id);

      toast.success('You are now live.');
      return alertData.id;
    } catch (err) {
      console.error(err);
      toast.error('Failed to go live');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SOS ---------------- */
  const handleSOSSubmit = async (type: string) => {
    if (!userLocation) {
      toast.warning('Enable location services first.');
      return;
    }

    setSOSLoading(true);
    setShowSOSModal(false);

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;

      if (!uid) throw new Error('User not found');

      await supabase.from('emergency_alerts').insert({
        user_id: uid,
        type,
        lat: userLocation[0],
        lng: userLocation[1],
        status: 'active',
        message: `${type} SOS triggered`,
      });

      setEmergencyActive(true);
      toast.success('SOS alert sent.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send SOS');
    } finally {
      setSOSLoading(false);
    }
  };

  /* ---------------- LOADING STATES ---------------- */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Redirecting..." />
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-black text-white">
      {(loading || sosLoading) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <LoadingIndicator label={loading ? 'Going live...' : 'Sending SOS...'} />
        </div>
      )}

      {emergencyActive && (
        <div className="fixed top-0 left-0 right-0 bg-red-700 p-3 z-40 text-center">
          <AlertTriangle className="inline mr-2 animate-pulse" />
          Emergency Active — Responders Notified
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6 pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900 p-6 rounded-xl text-center">
            <GoLiveButton onStart={handleGoLive} alertId={alertId} />
            <h3 className="mt-4 font-semibold">Go Live</h3>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl text-center">
            <SOSButton onSOS={() => setShowSOSModal(true)} />
            <h3 className="mt-4 font-semibold">SOS</h3>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl text-center">
            <Users className="mx-auto mb-2" />
            <div className="text-2xl font-bold">{respondersCount}</div>
            <p className="text-sm text-zinc-400">Responders Available</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin />
            <h2 className="font-semibold">Live Response Map</h2>
          </div>

          <div className="h-64 rounded-lg overflow-hidden">
            <ResponderMap
              responder={{
                lat: userLocation?.[0] ?? 0,
                lng: userLocation?.[1] ?? 0,
              }}
              victim={{
                lat: userLocation?.[0] ?? 0,
                lng: userLocation?.[1] ?? 0,
              }}
              onClose={() => {}}
            />
          </div>
        </div>
      </div>

      {showSOSModal && (
        <Modal onClose={() => setShowSOSModal(false)}>
          <h2 className="font-bold mb-4">Select Emergency Type</h2>
          {['Health', 'Assault', 'Fire', 'Accident', 'Other'].map((t) => (
            <button
              key={t}
              className="block w-full bg-red-600 py-3 rounded mb-2"
              onClick={() => handleSOSSubmit(t)}
            >
              {t}
            </button>
          ))}
        </Modal>
      )}
    </div>
  );
}
