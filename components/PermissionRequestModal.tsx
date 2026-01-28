'use client';

import { useState, useEffect } from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Permission Request Modal
 * Shows on first app open to request notification permissions
 * Explains why notifications are needed for emergencies
 */
export default function PermissionRequestModal() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already been asked
    const hasBeenAsked = localStorage.getItem('micall_permission_asked');
    if (hasBeenAsked === 'true') {
      return;
    }

    // Get user role
    checkUserAndShowModal();
  }, []);

  const checkUserAndShowModal = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        setUserRole(profile.role);
      }

      // Show modal unless already dismissed
      const dismissed = localStorage.getItem('micall_permission_dismissed');
      if (dismissed !== 'true') {
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Subscribe to push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });

          // Save subscription to database
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('notification_subscriptions').upsert(
              {
                user_id: user.id,
                subscription_data: subscription.toJSON(),
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          }
        }

        // Mark as asked
        localStorage.setItem('micall_permission_asked', 'true');
        setShowModal(false);
      } else if (permission === 'denied') {
        localStorage.setItem('micall_permission_asked', 'true');
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    localStorage.setItem('micall_permission_asked', 'true');
    setShowModal(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('micall_permission_dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleDismiss} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          {/* Close Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-slate-700 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-500/20 rounded-full p-4">
                <Bell className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Enable Notifications
            </h2>

            {/* Subtitle */}
            <p className="text-slate-400 text-center mb-6">
              {userRole === 'responder'
                ? 'Get instant alerts for emergencies in your area. Fast response saves lives.'
                : 'Get alerts when responders are nearby. Your safety depends on quick response.'}
            </p>

            {/* Benefits List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Real-time Alerts
                  </p>
                  <p className="text-xs text-slate-400">
                    Instant notifications even when the app is closed
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Critical Updates
                  </p>
                  <p className="text-xs text-slate-400">
                    Never miss important emergency information
                  </p>
                </div>
              </div>

              {userRole === 'responder' && (
                <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Location-based
                    </p>
                    <p className="text-xs text-slate-400">
                      Only alerts within your response radius
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions Info */}
            <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg mb-6">
              <p className="text-xs text-slate-400">
                🔒 We only send notifications for emergencies. You can customize your preferences anytime in settings.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleNotNow}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 font-medium rounded-lg transition disabled:opacity-50"
              >
                Not Now
              </button>
              <button
                onClick={handleRequestPermission}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Enable
                  </>
                )}
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-slate-500 text-center mt-4">
              Browser will prompt for permission
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
