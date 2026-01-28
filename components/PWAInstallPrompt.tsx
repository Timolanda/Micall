'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows install banner immediately, with 3-day reshow cooldown
 * Works on Android Chrome and edge browsers that support beforeinstallprompt
 */
export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if we should show based on cooldown
      const lastDismissed = localStorage.getItem('micall_install_dismissed_at');
      if (lastDismissed) {
        const dismissedTime = new Date(lastDismissed).getTime();
        const now = new Date().getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (now - dismissedTime < threeDaysMs) {
          return; // Still in cooldown
        }
      }

      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA installed');
      setShowPrompt(false);
      setIsInstalled(true);
      localStorage.setItem('micall_app_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkIfInstalled = () => {
    // Check localStorage flag
    const installed = localStorage.getItem('micall_app_installed');
    if (installed === 'true') {
      setIsInstalled(true);
      return;
    }

    // Check if running in standalone mode (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      localStorage.setItem('micall_app_installed', 'true');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted install prompt');
        setShowPrompt(false);
        setDeferredPrompt(null);
      } else {
        console.log('User dismissed install prompt');
        handleDismiss();
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Set cooldown - show again in 3 days
    localStorage.setItem('micall_install_dismissed_at', new Date().toISOString());
  };

  // Don't show if already installed or if no prompt available
  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Left: Icon and Text */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm">
              Install MiCall App
            </p>
            <p className="text-red-100 text-xs">
              Instant access. Works offline. Faster response times.
            </p>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition transform hover:scale-105 text-sm"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-red-500/50 rounded-lg transition"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
