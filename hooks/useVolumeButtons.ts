import { useEffect } from 'react';

interface UseVolumeButtonsProps {
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
}

/**
 * Hook to detect volume button presses on Android PWA/mobile devices
 * Falls back to arrow keys for desktop testing
 * ✅ Works in PWA mode on Android
 */
export function useVolumeButtons({ onVolumeUp, onVolumeDown }: UseVolumeButtonsProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('🔊 Key pressed:', e.key, e.code);

      // ✅ Android Volume Up
      if (e.code === 'VolumeUp' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        console.log('📱 Volume Up detected');
        onVolumeUp?.();
      }

      // ✅ Android Volume Down
      if (e.code === 'VolumeDown' || e.key === 'AudioVolumeDown') {
        e.preventDefault();
        console.log('📱 Volume Down detected');
        onVolumeDown?.();
      }

      // ✅ Fallback: Arrow keys for desktop testing
      if (e.key === 'ArrowUp') {
        console.log('⬆️ Arrow Up detected (desktop test)');
        onVolumeUp?.();
      }
      if (e.key === 'ArrowDown') {
        console.log('⬇️ Arrow Down detected (desktop test)');
        onVolumeDown?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onVolumeUp, onVolumeDown]);
}
