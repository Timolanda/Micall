import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { DbEmergencyAlert } from '../types';

export function useEmergencyAlerts(userId: string | null) {
  const [alerts, setAlerts] = useState<DbEmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    setLoading(true);
    supabase
      .from('emergency_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!isActive) return;
        setAlerts((data || []) as DbEmergencyAlert[]);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, (payload) => {
        setAlerts((prev) => [payload.new as DbEmergencyAlert, ...prev]);
      })
      .subscribe();
    return () => {
      isActive = false;
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const createAlert = async (alert: Omit<DbEmergencyAlert, 'id' | 'created_at'>) => {
    setLoading(true);
    const { data, error } = await supabase.from('emergency_alerts').insert([alert]);
    setLoading(false);
    return { data: data ? (data as DbEmergencyAlert[]) : [], error };
  };

  return { alerts, loading, error, createAlert };
} 