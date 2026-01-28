/**
 * AlertSoundToggle Component
 * 
 * UI component for toggling alert sound mute/unmute state.
 * Displays current mute state with speaker/muted icons.
 * Persists mute state to localStorage.
 * 
 * Usage:
 * ```tsx
 * import { AlertSoundToggle } from '@/components/AlertSoundToggle';
 * 
 * <AlertSoundToggle showLabel={true} />
 * ```
 */

'use client';

import { useAlertSound } from '@/hooks/useAlertSound';
import { Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface AlertSoundToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function AlertSoundToggle({ className = '', showLabel = false }: AlertSoundToggleProps) {
  const { isMuted, toggleMute } = useAlertSound();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`h-10 w-10 ${className}`} />;
  }

  return (
    <button
      onClick={toggleMute}
      className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-800 ${className}`}
      title={isMuted ? 'Unmute alert sounds' : 'Mute alert sounds'}
      aria-label={isMuted ? 'Alert sounds muted' : 'Alert sounds enabled'}
      type="button"
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5 text-gray-400 dark:text-gray-500" />
      ) : (
        <Volume2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
      )}
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isMuted ? 'Muted' : 'Sound'}
        </span>
      )}
      {isMuted && (
        <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
      )}
    </button>
  );
}
