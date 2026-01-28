'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { Bell, Lock, MapPin, LogOut, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationSettings {
  notify_all_emergencies: boolean;
  notify_police: boolean;
  notify_fire: boolean;
  notify_medical: boolean;
  notify_rescue: boolean;
  location_alert_radius_km: number;
  enable_sound: boolean;
  enable_vibration: boolean;
  enable_popup: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [enableAdminMode, setEnableAdminMode] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_all_emergencies: true,
    notify_police: true,
    notify_fire: true,
    notify_medical: true,
    notify_rescue: true,
    location_alert_radius_km: 5,
    enable_sound: true,
    enable_vibration: true,
    enable_popup: true,
  });

  // Check auth and redirect if needed
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/signin');
      return;
    }

    setAuthChecked(true);
  }, [user, authLoading, router]);

  // Load user role
  useEffect(() => {
    if (!user) return;

    const loadUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role);
          const adminRoles = ['admin', 'police', 'fire', 'hospital', 'ems'];
          setIsAdmin(adminRoles.includes(data.role?.toLowerCase() || ''));
        }
      } catch (err) {
        console.error('Error loading user role:', err);
      }
    };

    loadUserRole();
  }, [user]);

  // Load settings
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setSettings({
            notify_all_emergencies: data.notify_all_emergencies ?? true,
            notify_police: data.notify_police ?? true,
            notify_fire: data.notify_fire ?? true,
            notify_medical: data.notify_medical ?? true,
            notify_rescue: data.notify_rescue ?? true,
            location_alert_radius_km: data.location_alert_radius_km ?? 5,
            enable_sound: data.enable_sound ?? true,
            enable_vibration: data.enable_vibration ?? true,
            enable_popup: data.enable_popup ?? true,
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };

    loadSettings();
  }, [user]);

  // Save settings
  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: '❌ Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/signin');
    } catch (err) {
      console.error('Sign out error:', err);
      setMessage({ type: 'error', text: '❌ Failed to sign out' });
    }
  };

  // Handle go to admin
  const handleAccessAdmin = () => {
    router.push('/admin');
  };

  // Handle enable/disable admin mode
  const handleToggleAdminMode = async () => {
    if (!user) return;
    setEnableAdminMode(!enableAdminMode);
    setMessage({ 
      type: 'success', 
      text: enableAdminMode ? '❌ Admin mode disabled' : '✅ Admin mode enabled' 
    });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p>Please sign in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur z-10 -mx-4 px-4 py-4 mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your MiCall preferences</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/30 border border-green-500/30 text-green-400'
                : 'bg-red-900/30 border border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Notification Settings Section */}
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            {/* Alert Types */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Alert Types</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_all_emergencies}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_all_emergencies: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">All Emergencies</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_police}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_police: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Police Incidents</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_fire}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_fire: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Fire Emergencies</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_medical}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_medical: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Medical Emergencies</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_rescue}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_rescue: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Rescue Operations</span>
                </label>
              </div>
            </div>

            {/* Notification Style */}
            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Notification Style</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_sound}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_sound: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">🔔 Sound</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_vibration}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_vibration: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">📳 Vibration</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_popup}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_popup: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">💬 Pop-up</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Location Settings Section */}
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Location</h2>
          </div>

          <div className="space-y-4">
            <label>
              <span className="text-sm font-medium text-gray-300 block mb-2">
                Alert Radius: {settings.location_alert_radius_km} km
              </span>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.location_alert_radius_km}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    location_alert_radius_km: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500 mt-2 block">
                Get notified for emergencies within {settings.location_alert_radius_km} km of your location
              </span>
            </label>
          </div>
        </section>

        {/* Admin Section - Only show for admins */}
        {isAdmin && (
          <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold">Administrator Panel</h2>
              <span className="ml-auto text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full">
                Admin
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAccessAdmin}
                className="w-full px-4 py-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-lg text-left text-sm transition-colors flex items-center justify-between"
              >
                <span>📊 Admin Dashboard</span>
                <span className="text-xs text-purple-300">→</span>
              </button>
              <p className="text-xs text-gray-400 px-4">
                Access the full admin dashboard to manage alerts, responders, and system settings.
              </p>
            </div>

            {/* Show user conversion only for owner */}
            {user?.email === 'timolanda@gmail.com' && (
              <div className="mt-6 pt-6 border-t border-purple-500/30">
                <h3 className="text-sm font-semibold text-purple-300 mb-4">🔑 User Management</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Convert users to admin roles. This action is owner-only.
                </p>
                <button
                  onClick={() => router.push('/admin/convert-user')}
                  className="w-full px-4 py-3 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 rounded-lg text-left text-sm transition-colors flex items-center justify-between"
                >
                  <span>👥 Convert User to Admin</span>
                  <span className="text-xs text-yellow-300">→</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Privacy & Security Section */}
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Privacy & Security</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/privacy')}
              className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-left text-sm transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => router.push('/help')}
              className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-left text-sm transition-colors"
            >
              Help & Support
            </button>
          </div>
        </section>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Sign Out Section */}
        <section className="border-t border-gray-800 pt-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </section>

        {/* Version Info */}
        <div className="text-center text-xs text-gray-600 pt-6">
          <p>MiCall v1.0.0</p>
          <p>© 2025 MiCall Emergency Response</p>
        </div>
      </div>
    </div>
  );
} 