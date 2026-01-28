/**
 * useNativeBridge Hook
 * React wrapper for native power button functionality
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNativeBridge, PowerButtonEvent, NativeBridgeCapabilities } from '@/lib/native-bridge';
import { toast } from 'sonner';

export interface UseNativeBridgeProps {
  enabled?: boolean;
  onPowerButtonPress?: (event: PowerButtonEvent) => void;
  onLongPress?: (event: PowerButtonEvent) => void;
}

export function useNativeBridge({ enabled = true, onPowerButtonPress, onLongPress }: UseNativeBridgeProps) {
  const [capabilities, setCapabilities] = useState<NativeBridgeCapabilities>({
    hasAccessibility: false,
    hasBackground: false,
    platform: 'web',
  });

  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPressRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const bridge = getNativeBridge();

  /**
   * Get current capabilities
   */
  useEffect(() => {
    if (!enabled) return;

    const caps = bridge.getCapabilities();
    setCapabilities(caps);

    if (caps.platform === 'web') {
      bridge.setupWebFallback();
    }
  }, [enabled, bridge]);

  /**
   * Request accessibility permission (Android)
   */
  const requestPermission = useCallback(async () => {
    try {
      const granted = await bridge.requestAccessibilityPermission();
      setHasPermission(granted);

      if (granted) {
        toast.success('Power button monitoring enabled');
      } else {
        toast.error('Permission denied. Power button features disabled.');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      toast.error('Failed to request permission');
    }
  }, [bridge]);

  /**
   * Request foreground service (Android)
   */
  const requestForegroundService = useCallback(async () => {
    try {
      const granted = await bridge.requestForegroundService();
      if (granted) {
        toast.success('Background service enabled');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      toast.error('Failed to enable background service');
    }
  }, [bridge]);

  /**
   * Handle power button press
   */
  const handlePowerButtonPress = useCallback(
    (event: PowerButtonEvent) => {
      const now = Date.now();
      const timeSinceLastPress = now - lastPressRef.current;

      // Detect long press (2 second hold)
      if (event.isLongPress || event.duration > 2000) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        onLongPress?.(event);
      } else if (timeSinceLastPress < 500) {
        // Potential double-tap (within 500ms)
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = setTimeout(() => {
          onPowerButtonPress?.(event);
        }, 250);
      } else {
        onPowerButtonPress?.(event);
      }

      lastPressRef.current = now;
    },
    [onPowerButtonPress, onLongPress]
  );

  /**
   * Set up power button listener
   */
  useEffect(() => {
    if (!enabled || !hasPermission) return;

    unsubscribeRef.current = bridge.onPowerButton(handlePowerButtonPress);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [enabled, hasPermission, bridge, handlePowerButtonPress]);

  /**
   * Auto-request permission on mount (with user gesture)
   */
  useEffect(() => {
    if (!enabled) return;

    const autoRequest = async () => {
      if (capabilities.hasAccessibility && !hasPermission) {
        // Auto-request on Android (requires user gesture)
        // In production, this should be triggered by a button click
        await requestPermission();
      } else if (capabilities.platform === 'web') {
        setHasPermission(true);
      }
    };

    // Delay to ensure user interaction is complete
    const timeout = setTimeout(autoRequest, 1000);
    return () => clearTimeout(timeout);
  }, [enabled, capabilities, hasPermission, requestPermission]);

  return {
    capabilities,
    hasPermission,
    error,
    requestPermission,
    requestForegroundService,
    isSupported: capabilities.hasAccessibility || capabilities.platform === 'web',
  };
}
