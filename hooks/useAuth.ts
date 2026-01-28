import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ FIX: Always await getUser()
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError && userError.message !== 'Auth session missing!') {
          console.warn('getUser error:', userError);
          if (mounted) {
            setError(userError.message);
            setUser(null);
            setSession(null);
          }
          return;
        }

        // Try to get session as fallback
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(currentSession);
          setUser(currentUser ?? currentSession?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Auth initialization failed');
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // ✅ CRITICAL: Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        
        // ✅ Always await getUser() after state change
        if (newSession) {
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          setUser(currentUser ?? null);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return false;
        }
        // Refresh user state after login
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) setUser(newUser);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setError(msg);
        return false;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        setError(error.message);
      }
      // Clear user state
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  // Refresh user from auth state (in case of stale data)
  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: freshUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('Could not refresh user:', error);
        setUser(null);
        return false;
      }
      setUser(freshUser ?? null);
      return !!freshUser;
    } catch (err) {
      console.error('Refresh user error:', err);
      return false;
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    token: session?.access_token ?? null,
  };
}
