'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';

import AlertStoriesRow from '@/components/alerts/AlertStoriesRow';
import AlertStoryViewer from '@/components/alerts/AlertStoryViewer';
import { Alert } from '@/components/alerts/types';
import { getIgnoredAlertIds, ignoreAlertFor30Min } from '@/utils/alertIgnore';

const MAP_HEIGHT = 180;

/* ---------------- SAFE DYNAMIC IMPORTS ---------------- */
const ResponderLiveViewer = dynamic(
  () => import('@/components/ResponderLiveViewer'),
  { ssr: false }
);
const ResponderMap = dynamic(() => import('@/components/ResponderMap'), { ssr: false });

export interface AlertWithLocation extends Alert {
  lat: number;
  lng: number;
}

export default function LivePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [alerts, setAlerts] = useState<AlertWithLocation[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<number | null>(null);
  const [showStories, setShowStories] = useState(false);
  const [ignoredIds, setIgnoredIds] = useState<number[]>([]);
  const [responderLocation, setResponderLocation] = useState<{ lat: number; lng: number } | null>(null);

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/landing');
    }
  }, [loading, user, router]);

  /* ---------------- RESPONDER LOCATION (CLIENT ONLY) ---------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setResponderLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => {
      if (navigator.geolocation) navigator.geolocation.clearWatch(id);
    };
  }, []);

  /* ---------------- FETCH ALERTS ---------------- */
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('emergency_alerts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const normalized: AlertWithLocation[] = (data ?? []).map((a: any) => ({
          ...a,
          lat: Number(a.lat ?? 0),
          lng: Number(a.lng ?? 0),
        }));

        setAlerts(normalized);
        setIgnoredIds(getIgnoredAlertIds().map(Number));
      } catch (err) {
        console.error('Failed to fetch alerts', err);
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel('alerts-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        fetchAlerts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ---------------- DERIVED STATE ---------------- */
  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !ignoredIds.includes(a.id)),
    [alerts, ignoredIds]
  );

  const activeAlert = useMemo(
    () => visibleAlerts.find((a) => a.id === activeAlertId) ?? null,
    [visibleAlerts, activeAlertId]
  );

  /* ---------------- CLIENT-ONLY LIVE VIEW ---------------- */
  if (typeof window !== 'undefined' && activeAlert && user) {
    return (
      <ResponderLiveViewer
        alertId={String(activeAlert.id)}
        responderId={user.id}
        alertLat={activeAlert.lat}
        alertLng={activeAlert.lng}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 px-4 py-4 border-b border-white/10 bg-black">
        <h1 className="text-lg font-semibold">Live Emergency Alerts</h1>
        <p className="text-xs opacity-70">
          Tap an alert to preview. Respond only if safe.
        </p>
      </header>

      <div className="overflow-y-auto" style={{ paddingBottom: MAP_HEIGHT }}>
        {visibleAlerts.length > 0 ? (
          <AlertStoriesRow
            alerts={visibleAlerts}
            onSelect={(alert) => {
              setActiveAlertId(alert.id);
              setShowStories(true);
            }}
          />
        ) : (
          <div className="p-6 text-center opacity-60">No active alerts near you.</div>
        )}
      </div>

      {/* FIXED MAP */}
      <div className="fixed left-0 right-0 bottom-16 z-10 bg-black" style={{ height: MAP_HEIGHT }}>
        {typeof window !== 'undefined' && (
          <ResponderMap
            responder={responderLocation ?? undefined}
            victim={
              activeAlert ? { lat: activeAlert.lat, lng: activeAlert.lng } : undefined
            }
            maxHeight={`${MAP_HEIGHT}px`}
          />
        )}
      </div>

      {/* STORY VIEWER */}
      {showStories && activeAlertId !== null && (
        <AlertStoryViewer
          alerts={visibleAlerts}
          initialAlertId={activeAlertId}
          onClose={() => {
            setShowStories(false);
            setActiveAlertId(null);
          }}
          onIgnore={(id) => {
            ignoreAlertFor30Min(id);
            setIgnoredIds(getIgnoredAlertIds().map(Number));
            setShowStories(false);
            setActiveAlertId(null);
          }}
          onRespond={(alert) => {
            setActiveAlertId(alert.id);
            setShowStories(false);
          }}
        />
      )}
    </div>
  );
}
