/**
 * Global Theft Mode Detector
 * Runs on app load and monitors theft status
 * Non-destructive - only activates if isStolen flag is true
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import { getTheftAlarmEngine } from '@/utils/theftAlarmEngine';
import type { TheftModeState } from '@/types/theft';

interface UseTheftModeDetectorOptions {
  pollInterval?: number;
  enableAutoResume?: boolean;
  debugMode?: boolean;
}

export function useTheftModeDetector(options: UseTheftModeDetectorOptions = {}) {
  const { user } = useAuth();
  const { 
    pollInterval = 5000, 
    enableAutoResume = true,
    debugMode = false 
  } = options;

  const theftStateRef = useRef<TheftModeState | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Fetch current theft status from backend
   */
  const fetchTheftStatus = useCallback(async (userId: string): Promise<TheftModeState | null> => {
    try {
      // Once backend is ready, replace with actual Supabase query
      // For now, return mock data structure
      
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .select('is_stolen, stolen_activated_at, device_id')
      //   .eq('id', userId)
      //   .single();
      //
      // if (error) throw error;
      // return data ? { isStolen: data.is_stolen, ... } : null;

      if (debugMode) {
        console.log(`🔍 [TheftDetector] Fetching theft status for user: ${userId}`);
      }

      // Placeholder - will be replaced with actual API call
      return null;
    } catch (err) {
      console.error('❌ Failed to fetch theft status:', err);
      return null;
    }
  }, [debugMode]);

  /**
   * Handle activation of theft mode
   */
  const activateTheftMode = useCallback((state: TheftModeState) => {
    if (debugMode) {
      console.log('🚨 [TheftDetector] Activating theft mode:', state);
    }

    theftStateRef.current = state;

    // Start alarm
    const alarm = getTheftAlarmEngine();
    alarm.startAlarm();

    // Show stolen screen (will be implemented in component)
    const stolenScreenEvent = new CustomEvent('theft-mode-activated', {
      detail: state,
    });
    window.dispatchEvent(stolenScreenEvent);

    // Start location broadcasting (reuse existing infrastructure)
    broadcastLiveLocation();
  }, [debugMode]);

  /**
   * Deactivate theft mode (only for authenticated user)
   */
  const deactivateTheftMode = useCallback(() => {
    if (debugMode) {
      console.log('✅ [TheftDetector] Deactivating theft mode');
    }

    const alarm = getTheftAlarmEngine();
    alarm.stopAlarm();

    // Hide stolen screen
    const stolenScreenEvent = new CustomEvent('theft-mode-deactivated');
    window.dispatchEvent(stolenScreenEvent);

    theftStateRef.current = null;
  }, [debugMode]);

  /**
   * Broadcast live location to trusted contacts
   * Reuses existing location-sharing infrastructure
   */
  const broadcastLiveLocation = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Once backend is ready:
      // Get user's location
      // Send to all trusted contacts via existing notification system
      // Update every 5 seconds

      if (debugMode) {
        console.log('📍 [TheftDetector] Broadcasting live location to contacts');
      }

      // Placeholder - integrate with existing location system
    } catch (err) {
      console.error('❌ Failed to broadcast location:', err);
    }
  }, [user?.id, debugMode]);

  /**
   * Check theft status on app load
   */
  const checkTheftStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const status = await fetchTheftStatus(user.id);

      if (status?.isStolen) {
        activateTheftMode(status);
      } else {
        deactivateTheftMode();
      }
    } catch (err) {
      console.error('❌ Error checking theft status:', err);
    }
  }, [user?.id, fetchTheftStatus, activateTheftMode, deactivateTheftMode]);

  /**
   * Main effect: Check theft status on mount and app resume
   */
  useEffect(() => {
    if (!user?.id) {
      isInitializedRef.current = false;
      return;
    }

    // Check once on mount
    if (!isInitializedRef.current) {
      checkTheftStatus();
      isInitializedRef.current = true;
    }

    // Handle app resume (visibility change)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (debugMode) {
          console.log('🔔 [TheftDetector] App resumed, checking theft status...');
        }
        checkTheftStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle app resume (focus)
    const handleWindowFocus = () => {
      if (debugMode) {
        console.log('🔔 [TheftDetector] Window focused, checking theft status...');
      }
      checkTheftStatus();
    };

    window.addEventListener('focus', handleWindowFocus);

    // Periodic polling as fallback
    if (enableAutoResume) {
      pollIntervalRef.current = setInterval(() => {
        if (debugMode) {
          console.log('🔄 [TheftDetector] Polling theft status...');
        }
        checkTheftStatus();
      }, pollInterval);
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user?.id, checkTheftStatus, enableAutoResume, pollInterval, debugMode]);

  return {
    theftStatus: theftStateRef.current,
    activateTheftMode,
    deactivateTheftMode,
    checkTheftStatus,
  };
}
