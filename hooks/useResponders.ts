import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Responder } from '../types';

export function useResponders() {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('responders')
      .select('*')
      .then(({ data, error }) => {
        setResponders((data || []) as Responder[]);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time location updates
    const subscription = supabase
      .channel('responders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, (payload) => {
        setResponders((prev) => {
          const newResponder = payload.new as Responder;
          const idx = prev.findIndex((r) => r.id === newResponder.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = newResponder;
            return updated;
          }
          return [newResponder, ...prev];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { responders, loading, error };
} 