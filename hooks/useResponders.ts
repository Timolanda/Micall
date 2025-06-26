import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useResponders() {
  const [responders, setResponders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('responders')
      .select('*')
      .then(({ data, error }) => {
        setResponders(data || []);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time location updates
    const subscription = supabase
      .channel('responders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, (payload) => {
        setResponders((prev) => {
          const idx = prev.findIndex((r) => r.id === payload.new.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = payload.new;
            return updated;
          }
          return [payload.new, ...prev];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { responders, loading, error };
} 