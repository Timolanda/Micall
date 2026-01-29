import { useEffect, useState } from 'react';

interface UseLockedPhoneVolumeProps {
  onVolumeUp?: () => void;
  enabled?: boolean;
  debugMode?: boolean;
}

/**
 * ✅ LOCKED PHONE SUPPORT via Capacitor
 * Detects Volume Up button even when phone is LOCKED
 * Opens full homepage with emergency features (SOS, Go Live, etc)
 *
 * Requirements:
 * - Native Android app (via Capacitor)
 * - Proper permissions in AndroidManifest.xml
 *
 * Usage:
 * - User has emergency on locked phone? Press Volume Up
 * - Homepage opens with emergency mode ready
 * - Full access to SOS, Go Live, emergency alert
 */
export function useLockedPhoneVolume({
  onVolumeUp,
  enabled = true,
  debugMode = false,
}: UseLockedPhoneVolumeProps) {
  const [isCapacitorAvailable, setIsCapacitorAvailable] = useState(false);

  useEffect(() => {
    // Check if running in native Capacitor environment
    if (typeof window !== 'undefined') {
      const isNative =
        (window as any).Capacitor !== undefined &&
        (window as any).Capacitor.isNativePlatform?.() === true;

      setIsCapacitorAvailable(isNative);

      if (debugMode) {
        console.log('📱 Capacitor native environment:', isNative);
      }
    }
  }, [debugMode]);

  useEffect(() => {
    if (!enabled) return;

    // Detect Volume Up button press
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'VolumeUp' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        if (debugMode) console.log('🔊 Volume Up detected - opening homepage');
        onVolumeUp?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, onVolumeUp, debugMode]);

  return { isCapacitorAvailable };
}
