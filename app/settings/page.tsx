'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Bell, 
  MapPin, 
  Moon, 
  LogOut, 
  Shield, 
  HelpCircle, 
  Settings as SettingsIcon,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function SettingsPage() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const { profile, updateProfile, loading: profileLoading } = useProfile(userId);
  const [notifications, setNotifications] = useState(profile?.notifications_enabled ?? true);
  const [locationSharing, setLocationSharing] = useState(profile?.location_sharing ?? true);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Sync state with profile
  useEffect(() => {
    setNotifications(profile?.notifications_enabled ?? true);
    setLocationSharing(profile?.location_sharing ?? true);
  }, [profile]);

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    if (!notifications) {
      // Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifLoading(false);
        return;
      }
    }
    setNotifications(!notifications);
    await updateProfile({ notifications_enabled: !notifications });
    setNotifLoading(false);
  };

  const handleToggleLocationSharing = async () => {
    setLocLoading(true);
    setLocationSharing(!locationSharing);
    await updateProfile({ location_sharing: !locationSharing });
    setLocLoading(false);
    // Optionally: trigger a callback/side effect in the app to enable/disable geolocation
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/landing';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const settingsItems = [
    {
      icon: <Bell size={20} />,
      title: 'Push Notifications',
      description: 'Receive emergency alerts and updates',
      action: (
        <button
          onClick={handleToggleNotifications}
          className="flex items-center"
          disabled={notifLoading || profileLoading}
        >
          {notifications ? (
            <ToggleRight size={24} className="text-primary" />
          ) : (
            <ToggleLeft size={24} className="text-zinc-600" />
          )}
        </button>
      )
    },
    {
      icon: <MapPin size={20} />,
      title: 'Location Sharing',
      description: 'Share your location with emergency responders',
      action: (
        <button
          onClick={handleToggleLocationSharing}
          className="flex items-center"
          disabled={locLoading || profileLoading}
        >
          {locationSharing ? (
            <ToggleRight size={24} className="text-primary" />
          ) : (
            <ToggleLeft size={24} className="text-zinc-600" />
          )}
        </button>
      )
    },
    {
      icon: <Moon size={20} />,
      title: 'Dark Mode',
      description: 'Use dark theme for better visibility',
      action: (
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center"
        >
          {darkMode ? (
            <ToggleRight size={24} className="text-primary" />
          ) : (
            <ToggleLeft size={24} className="text-zinc-600" />
          )}
        </button>
      )
    }
  ];

  const actionItems = [
    {
      icon: <Shield size={20} />,
      title: 'Privacy Policy',
      description: 'Read our privacy policy',
      action: () => window.open('/privacy', '_blank')
    },
    {
      icon: <HelpCircle size={20} />,
      title: 'Help & Support',
      description: 'Get help and contact support',
      action: () => window.open('/help', '_blank')
    },
    {
      icon: <LogOut size={20} />,
      title: 'Sign Out',
      description: 'Sign out of your account',
      action: handleLogout,
      danger: true
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-zinc-400">Customize your emergency response experience</p>
        </div>

        {/* Settings Icon */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900 rounded-full p-6 shadow-lg border border-zinc-700">
            <SettingsIcon size={32} className="text-primary" />
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow-inner mb-8">
          <h2 className="text-xl font-semibold mb-6">App Settings</h2>
          <div className="space-y-6">
            {settingsItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-primary">{item.icon}</div>
                  <div>
                    <h3 className="font-medium text-lg">{item.title}</h3>
                    <p className="text-sm text-zinc-400">{item.description}</p>
                  </div>
                </div>
                {item.action}
              </div>
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow-inner">
          <h2 className="text-xl font-semibold mb-6">Account</h2>
          <div className="space-y-4">
            {actionItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                disabled={loading && item.title === 'Sign Out'}
                className={`w-full flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors ${
                  item.danger ? 'hover:bg-red-900/20' : ''
                } ${loading && item.title === 'Sign Out' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={item.danger ? 'text-red-400' : 'text-primary'}>
                    {item.icon}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-medium text-lg ${item.danger ? 'text-red-400' : ''}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-zinc-400">{item.description}</p>
                  </div>
                </div>
                {loading && item.title === 'Sign Out' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <div className="text-zinc-400">→</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* App Version */}
        <div className="text-center mt-8 text-zinc-500 text-sm">
          <p>MiCall Emergency Response</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
} 