import { useCallback, useRef } from 'react';
import { useVolumeButtons } from './useVolumeButtons';
import { useShakeDetection } from './useShakeDetection';

interface UseHybridEmergencyProps {
  onTrigger?: () => void | Promise<void>;
  enabled?: boolean;
  volumeUpEnabled?: boolean;
  volumeDownEnabled?: boolean;
  shakeEnabled?: boolean;
  shakeThreshold?: number;
  debugMode?: boolean;
}

/**
 * Hybrid emergency trigger hook
 * Combines multiple input methods:
 * - Volume Up button (Android PWA)
 * - Volume Down button (Android PWA)
 * - Device shake (iOS/Android PWA)
 * - Power button (native Android only)
 * - Arrow keys (desktop testing)
 *
 * ✅ Works in PWA mode
 * ✅ Works in native Android app
 * ✅ Works on desktop (with arrow keys)
 */
export function useHybridEmergency({
  onTrigger,
  enabled = true,
  volumeUpEnabled = true,
  volumeDownEnabled = false,
  shakeEnabled = true,
  shakeThreshold = 20,
  debugMode = false,
}: UseHybridEmergencyProps) {
  const triggerInProgressRef = useRef(false);

  const handleTrigger = useCallback(async (source: string) => {
    if (!enabled || triggerInProgressRef.current) return;

    triggerInProgressRef.current = true;

    try {
      if (debugMode) {
        console.log(`🚨 Emergency triggered via: ${source}`);
      }
      await onTrigger?.();
    } catch (err) {
      console.error('❌ Emergency trigger error:', err);
    } finally {
      triggerInProgressRef.current = false;
    }
  }, [onTrigger, enabled, debugMode]);

  // Volume button triggers
  useVolumeButtons({
    onVolumeUp: volumeUpEnabled
      ? () => handleTrigger('Volume Up')
      : undefined,
    onVolumeDown: volumeDownEnabled
      ? () => handleTrigger('Volume Down')
      : undefined,
  });

  // Device shake trigger
  useShakeDetection({
    onShake: shakeEnabled
      ? () => handleTrigger('Device Shake')
      : undefined,
    threshold: shakeThreshold,
  });

  // Power button trigger (native Android via Capacitor/Cordova)
  if (typeof window !== 'undefined') {
    (window as any).handlePowerButtonPress = () => {
      handleTrigger('Power Button');
    };
  }
}
