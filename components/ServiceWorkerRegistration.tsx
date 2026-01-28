'use client';

import { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

/**
 * Service Worker Registration Component
 * Registers the service worker and handles updates
 */
export default function ServiceWorkerRegistration() {
  const { swReady } = usePWA();

  useEffect(() => {
    // Service worker is registered via the usePWA hook
    // Check for updates periodically
    if (swReady && 'serviceWorker' in navigator) {
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.update();
        } catch (error) {
          console.error('Error checking for service worker updates:', error);
        }
      };

      // Check for updates every 1 hour
      checkForUpdates();
      const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

      return () => {
        clearInterval(updateInterval);
      };
    }
  }, [swReady]);

  // This component doesn't render anything visible
  return null;
}
