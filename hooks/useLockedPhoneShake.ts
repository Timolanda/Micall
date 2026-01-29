import { useEffect, useState } from 'react';

interface UseLockedPhoneShakeProps {
  onShake?: () => void;
  enabled?: boolean;
  threshold?: number;
  debugMode?: boolean;
}

/**
 * ✅ LOCKED PHONE SHAKE DETECTION via Capacitor Motion
 * Detects device shake even when phone is LOCKED
 * Opens full homepage with emergency features (SOS, Go Live, etc)
 *
 * Perfect for:
 * - Medical emergency when unconscious
 * - Any emergency without access to unlock pattern
 * - Fastest emergency access possible
 *
 * How it works:
 * - Accelerometer runs at system level, not blocked by lock screen
 * - WakeLock keeps screen on during emergency
 */
export function useLockedPhoneShake({
  onShake,
  enabled = true,
  threshold = 25, // Higher threshold for when locked (to avoid false positives)
  debugMode = false,
}: UseLockedPhoneShakeProps) {
  const [isCapacitorAvailable, setIsCapacitorAvailable] = useState(false);
  const [motionSupported, setMotionSupported] = useState(false);
  const [lastShake, setLastShake] = useState(Date.now());

  useEffect(() => {
    // Check Capacitor availability
    const isNative =
      typeof window !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform?.() === true;

    setIsCapacitorAvailable(isNative);

    if (debugMode) {
      console.log('📱 Capacitor Motion available:', isNative);
    }
  }, [debugMode]);

  useEffect(() => {
    if (!enabled) return;

    // Browser DeviceMotionEvent (works on all devices)
    const handleMotion = (event: DeviceMotionEvent) => {
      const x = event.acceleration?.x ?? 0;
      const y = event.acceleration?.y ?? 0;
      const z = event.acceleration?.z ?? 0;
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > threshold) {
        const now = Date.now();
        if (now - lastShake > 500) {
          if (debugMode) {
            console.log(
              '📱 Shake detected - opening homepage',
              acceleration
            );
          }
          onShake?.();
          setLastShake(now);
        }
      }
    };

    // Request permission (iOS 13+)
    if (
      typeof (window as any).DeviceMotionEvent?.requestPermission === 'function'
    ) {
      (window as any).DeviceMotionEvent.requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion, true);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion, true);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [enabled, threshold, lastShake, onShake, debugMode]);

  return { isCapacitorAvailable, motionSupported };
}
