/**
 * useAlertSound Hook
 * 
 * React hook for managing alert sounds in components.
 * Provides async methods to play, stop, and toggle mute state.
 * Syncs mute state with localStorage on mount.
 * 
 * Usage:
 * ```typescript
 * import { useAlertSound } from '@/hooks/useAlertSound';
 * 
 * export function MyComponent() {
 *   const { playCritical, toggleMute, isMuted } = useAlertSound();
 *   
 *   return (
 *     <button onClick={() => playCritical()}>
 *       {isMuted ? 'Unmute' : 'Mute'}
 *     </button>
 *   );
 * }
 * ```
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  alertSound,
  playCriticalAlert,
  playResponderAlert,
  playNotificationAlert,
  stopAlertSound,
  toggleAlertMute,
  getAlertMuteState,
  setAlertMuted,
} from '@/lib/alert-sound';

export interface UseAlertSoundReturn {
  // Methods
  playCritical: (maxDuration?: number) => Promise<void>;
  playResponder: (maxDuration?: number) => Promise<void>;
  playNotification: (maxDuration?: number) => Promise<void>;
  playCustom: (soundType: 'critical' | 'notification' | 'responder', maxDuration?: number) => Promise<void>;
  stop: () => void;
  toggleMute: () => boolean;
  setMuted: (muted: boolean) => void;
  
  // State
  isMuted: boolean;
  isPlaying: boolean;
}

/**
 * Hook to manage alert sounds with React state
 */
export function useAlertSound(): UseAlertSoundReturn {
  const [isMuted, setIsMutedState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync mute state from localStorage on mount
  useEffect(() => {
    setIsMutedState(getAlertMuteState());
  }, []);

  // Monitor alert sound state changes
  useEffect(() => {
    const checkState = setInterval(() => {
      setIsPlaying(alertSound.getIsPlaying());
      setIsMutedState(alertSound.getMuted());
    }, 100);

    return () => clearInterval(checkState);
  }, []);

  // Play critical alert
  const playCritical = useCallback(
    async (maxDuration?: number) => {
      try {
        await playCriticalAlert(maxDuration);
        setIsPlaying(true);
        // Reset playing state after sound ends
        setTimeout(() => setIsPlaying(false), (maxDuration ?? 5) * 1000 + 100);
      } catch (error) {
        console.error('Error playing critical alert:', error);
      }
    },
    [],
  );

  // Play responder alert
  const playResponder = useCallback(
    async (maxDuration?: number) => {
      try {
        await playResponderAlert(maxDuration);
        setIsPlaying(true);
        // Reset playing state after sound ends
        setTimeout(() => setIsPlaying(false), (maxDuration ?? 3) * 1000 + 100);
      } catch (error) {
        console.error('Error playing responder alert:', error);
      }
    },
    [],
  );

  // Play notification alert
  const playNotification = useCallback(
    async (maxDuration?: number) => {
      try {
        await playNotificationAlert(maxDuration);
        setIsPlaying(true);
        // Reset playing state after sound ends
        setTimeout(() => setIsPlaying(false), (maxDuration ?? 1.5) * 1000 + 100);
      } catch (error) {
        console.error('Error playing notification alert:', error);
      }
    },
    [],
  );

  // Play custom alert
  const playCustom = useCallback(
    async (soundType: 'critical' | 'notification' | 'responder', maxDuration?: number) => {
      try {
        switch (soundType) {
          case 'critical':
            await playCriticalAlert(maxDuration);
            break;
          case 'responder':
            await playResponderAlert(maxDuration);
            break;
          case 'notification':
            await playNotificationAlert(maxDuration);
            break;
        }
        setIsPlaying(true);
        // Reset playing state after sound ends
        const duration = maxDuration ?? (soundType === 'critical' ? 5 : soundType === 'responder' ? 3 : 1.5);
        setTimeout(() => setIsPlaying(false), duration * 1000 + 100);
      } catch (error) {
        console.error(`Error playing ${soundType} alert:`, error);
      }
    },
    [],
  );

  // Stop current sound
  const stop = useCallback(() => {
    stopAlertSound();
    setIsPlaying(false);
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    const newState = toggleAlertMute();
    setIsMutedState(newState);
    return newState;
  }, []);

  // Set mute state
  const handleSetMuted = useCallback((muted: boolean) => {
    setAlertMuted(muted);
    setIsMutedState(muted);
  }, []);

  return {
    playCritical,
    playResponder,
    playNotification,
    playCustom,
    stop,
    toggleMute: handleToggleMute,
    setMuted: handleSetMuted,
    isMuted,
    isPlaying,
  };
}
