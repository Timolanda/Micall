import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useEmergencyAlerts(userId: string | null) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('emergency_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setAlerts(data || []);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, (payload) => {
        setAlerts((prev) => [payload.new, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const createAlert = async (alert: any) => {
    setLoading(true);
    const { data, error } = await supabase.from('emergency_alerts').insert([alert]);
    setLoading(false);
    return { data, error };
  };

  return { alerts, loading, error, createAlert };
} 