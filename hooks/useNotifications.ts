import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useNotifications(userId: string | null, userLocation: [number, number] | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !userLocation) return;
    setLoading(true);
    supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setNotifications(data || []);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time notification updates
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, (payload) => {
        // Only notify if within 1km radius (implement distance check as needed)
        setNotifications((prev) => [payload.new, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, userLocation]);

  return { notifications, loading, error };
} 