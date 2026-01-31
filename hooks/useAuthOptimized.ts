import { useAuth } from './useAuth';
import { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Optimized wrapper around useAuth that memoizes the result
 * to prevent unnecessary re-renders and downstream hook calls.
 */
export function useAuthOptimized() {
  const authState = useAuth();
  
  // Memoize to prevent child components from re-rendering unnecessarily
  const memoizedState = useMemo(
    () => ({
      user: authState.user,
      session: authState.session,
      loading: authState.loading,
      error: authState.error,
    }),
    [authState.user?.id, authState.session?.user.id, authState.loading, authState.error]
  );

  return memoizedState;
}
