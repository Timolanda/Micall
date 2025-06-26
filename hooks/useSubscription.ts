import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSubscription(userId: string | null) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        setSubscription(data);
        setError(error ? error.message : null);
        setLoading(false);
      });
  }, [userId]);

  return { subscription, loading, error };
} 