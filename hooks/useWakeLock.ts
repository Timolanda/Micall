'use client';

import { useEffect } from 'react';

interface UseWakeLockProps {
  enabled?: boolean;
  debugMode?: boolean;
}

/**
 * ✅ KEEP SCREEN ON during emergency
 * Prevents phone from locking/sleeping during emergency response
 * Requires Capacitor or native Android implementation
 */
export function useWakeLock({ enabled = false, debugMode = false }: UseWakeLockProps) {
  useEffect(() => {
    if (!enabled) return;

    const acquireWakeLock = async () => {
      try {
        // Try native Capacitor first
        if ((window as any).Capacitor?.Plugins?.ScreenBrightness) {
          const ScreenBrightness = (window as any).Capacitor.Plugins.ScreenBrightness;
          await ScreenBrightness.setBrightness({ brightness: 1 }); // Max brightness
          if (debugMode) console.log('✅ WakeLock acquired (Capacitor)');
          return;
        }

        // Browser WakeLock API (if available)
        if ('wakeLock' in navigator) {
          const sentinel = await (navigator as any).wakeLock.request('screen');

          // Re-acquire if screen wakes up
          document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
              try {
                await (navigator as any).wakeLock.request('screen');
                if (debugMode) console.log('✅ WakeLock re-acquired');
              } catch (err) {
                console.warn('WakeLock re-acquire error:', err);
              }
            }
          });

          if (debugMode) console.log('✅ WakeLock acquired (Browser API)');

          return () => {
            sentinel?.release();
          };
        }
      } catch (err) {
        console.warn('❌ WakeLock error:', err);
      }
    };

    acquireWakeLock();
  }, [enabled, debugMode]);
}
