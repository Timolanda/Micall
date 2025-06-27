import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Profile } from '../types';

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        setProfile(data ? (data as Profile) : null);
        setError(error ? error.message : null);
        setLoading(false);
      });
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .single();
    setProfile(data ? (data as Profile) : null);
    setError(error ? error.message : null);
    setLoading(false);
    return { data: data as Profile | null, error };
  };

  return { profile, loading, error, updateProfile };
} 