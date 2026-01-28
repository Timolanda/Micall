'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * usePWA Hook
 * Manages PWA installation and app state detection
 */

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  canRequest: boolean;
  isOnline: boolean;
  swReady: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    canRequest: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    swReady: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then(() => {
          setState((prev) => ({ ...prev, swReady: true }));
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          setState((prev) => ({ ...prev, swReady: false }));
        });
    }
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Check if app is installed
  useEffect(() => {
    const checkInstalled = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const apps = await (navigator as any).getInstalledRelatedApps?.();
          setState((prev) => ({
            ...prev,
            isInstalled: apps && apps.length > 0,
          }));
        } catch (err) {
          console.error('Error checking installed apps:', err);
        }
      }

      // Fallback: check display mode
      const isStandalone =
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      setState((prev) => ({ ...prev, isInstalled: isStandalone }));
    };

    checkInstalled();
  }, []);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.error('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.error('Error requesting notification permission:', err);
        return false;
      }
    }

    return false;
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push notifications not supported');
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      return subscription;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      return null;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    try {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      return false;
    }
  }, []);

  // Trigger install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      (deferredPrompt as any).prompt?.();
      const { outcome } = await (deferredPrompt as any).userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState((prev) => ({ ...prev, isInstalled: true }));
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error triggering install prompt:', err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    // State
    isInstallable: state.isInstallable,
    isInstalled: state.isInstalled,
    canRequest: state.canRequest,
    isOnline: state.isOnline,
    swReady: state.swReady,

    // Methods
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    promptInstall,
  };
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to detect screen orientation
 */
export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<{
    type: 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';
    angle: number;
  }>({
    type: 'portrait-primary',
    angle: 0,
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation({
          type: screen.orientation.type as any,
          angle: screen.orientation.angle,
        });
      } else {
        // Fallback for browsers without screen.orientation
        const isPortrait = window.innerHeight > window.innerWidth;
        setOrientation({
          type: isPortrait ? 'portrait-primary' : 'landscape-primary',
          angle: 0,
        });
      }
    };

    handleOrientationChange();

    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      screen.orientation?.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * Hook to detect if app is in fullscreen
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Error requesting fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }, []);

  return {
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}
