import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { DbEmergencyAlert } from '../types';

export function useHistory(userId: string | null) {
  const [history, setHistory] = useState<DbEmergencyAlert[]>([]);
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
        setHistory((data || []) as DbEmergencyAlert[]);
        setError(error ? error.message : null);
        setLoading(false);
      });
  }, [userId]);

  return { history, loading, error };
} 