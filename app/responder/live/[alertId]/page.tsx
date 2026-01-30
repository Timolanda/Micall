'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

import VictimLiveBroadcaster from '@/components/live/VictimLiveBroadcaster';
import ResponderLiveViewer from '@/components/ResponderLiveViewer';

interface Alert {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  status: string;
}

export default function LiveAlertPage({
  params,
}: {
  params: { alertId: string };
}) {
  const { user } = useAuth();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  /* ======================
     FETCH ALERT
  ====================== */
  useEffect(() => {
    let mounted = true;

    const fetchAlert = async () => {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('id, user_id, lat, lng, status')
        .eq('id', params.alertId)
        .single();

      if (!error && mounted) {
        setAlert(data);
      }

      setLoading(false);
    };

    fetchAlert();

    return () => {
      mounted = false;
    };
  }, [params.alertId]);

  /* ======================
     LOADING / GUARDS
  ====================== */
  if (loading || !user) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Connecting to live emergency…
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Emergency not found.
      </div>
    );
  }

  /* ======================
     ROLE DETECTION
  ====================== */
  const isVictim = alert.user_id === user.id;

  /* ======================
     RENDER
  ====================== */
  if (isVictim) {
    return <VictimLiveBroadcaster alertId={alert.id} />;
  }

  return (
    <ResponderLiveViewer
      alertId={alert.id}
      responderId={user.id}
      alertLat={alert.lat}
      alertLng={alert.lng}
    />
  );
}
