import { useEffect } from 'react';

interface UseShakeDetectionProps {
  onShake?: () => void;
  threshold?: number; // Acceleration magnitude threshold (default: 15)
  debounce?: number; // Debounce time in ms (default: 500)
}

/**
 * Hook to detect device shake via accelerometer
 * ✅ Works in PWA mode on iOS and Android
 * Requires user permission on iOS 13+
 */
export function useShakeDetection({
  onShake,
  threshold = 15,
  debounce = 500,
}: UseShakeDetectionProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if device supports motion events
    if (!window.DeviceMotionEvent) {
      console.warn('🚨 Device Motion API not supported on this device');
      return;
    }

    let lastShake = Date.now();

    const handleMotion = (event: DeviceMotionEvent) => {
      const x = event.acceleration?.x ?? 0;
      const y = event.acceleration?.y ?? 0;
      const z = event.acceleration?.z ?? 0;

      // Calculate magnitude of acceleration vector
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      // Detect shake event
      if (acceleration > threshold) {
        const now = Date.now();
        if (now - lastShake > debounce) {
          console.log('📱 Device shake detected!', {
            acceleration,
            threshold,
          });
          onShake?.();
          lastShake = now;
        }
      }
    };

    // Request permission (iOS 13+)
    const requestPermissionAndListen = async () => {
      try {
        if (
          typeof (window as any).DeviceMotionEvent !== 'undefined' &&
          typeof (window as any).DeviceMotionEvent.requestPermission === 'function'
        ) {
          // iOS 13+ requires explicit permission
          const permission = await (window as any).DeviceMotionEvent.requestPermission();
          if (permission === 'granted') {
            console.log('✅ Device Motion permission granted (iOS)');
            window.addEventListener('devicemotion', handleMotion, true);
          } else {
            console.warn('❌ Device Motion permission denied');
          }
        } else {
          // Android and older iOS - no permission needed
          console.log('✅ Device Motion listening enabled (Android/non-iOS13)');
          window.addEventListener('devicemotion', handleMotion, true);
        }
      } catch (err) {
        console.error('❌ Device Motion error:', err);
      }
    };

    requestPermissionAndListen();

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [onShake, threshold, debounce]);
}
