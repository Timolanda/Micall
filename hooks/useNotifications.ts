import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { DbEmergencyAlert } from '../types';
import { isWithinRadiusKm } from '../utils/distance';

export function useNotifications(userId: string | null, userLocation: [number, number] | null) {
  const [notifications, setNotifications] = useState<DbEmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !userLocation) return;
    let isActive = true;
    setLoading(true);
    supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!isActive) return;
        const alerts = (data || []) as DbEmergencyAlert[];
        const filtered = alerts.filter((alert) => {
          if (typeof alert.lat !== 'number' || typeof alert.lng !== 'number') return false;
          return isWithinRadiusKm(userLocation, [alert.lat, alert.lng], 1);
        });
        setNotifications(filtered);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time notification updates
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, (payload) => {
        if (!isActive) return;
        const alert = payload.new as DbEmergencyAlert;
        if (typeof alert.lat !== 'number' || typeof alert.lng !== 'number') return;
        if (!isWithinRadiusKm(userLocation, [alert.lat, alert.lng], 1)) return;
        setNotifications((prev) => [alert, ...prev]);
      })
      .subscribe();
    return () => {
      isActive = false;
      supabase.removeChannel(subscription);
    };
  }, [userId, userLocation]);

  return { notifications, loading, error };
} 