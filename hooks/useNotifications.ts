import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setNotifications(data || []);
        setError(error ? error.message : null);
        setLoading(false);
      });
    // Subscribe to real-time notification updates
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  return { notifications, loading, error };
} 