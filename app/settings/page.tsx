'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [dark, setDark] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  const handleToggleDark = () => {
    setDark((d) => !d);
    document.documentElement.classList.toggle('dark');
  };
  const handleToggleNotifications = () => setNotifications((n) => !n);
  const handleToggleLocation = () => setLocationSharing((l) => !l);

  const handleLogout = () => {
    // Add logout logic (e.g., supabase.auth.signOut())
    alert('Logged out!');
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Dark Mode</span>
        <button onClick={handleToggleDark} className="bg-zinc-700 text-white px-3 py-1 rounded">
          {dark ? 'On' : 'Off'}
        </button>
      </div>
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Notifications</span>
        <button onClick={handleToggleNotifications} className="bg-zinc-700 text-white px-3 py-1 rounded">
          {notifications ? 'On' : 'Off'}
        </button>
      </div>
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Location Sharing</span>
        <button onClick={handleToggleLocation} className="bg-zinc-700 text-white px-3 py-1 rounded">
          {locationSharing ? 'On' : 'Off'}
        </button>
      </div>
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Account</span>
        <button onClick={handleLogout} className="bg-danger text-white px-3 py-1 rounded">Logout</button>
      </div>
      <div className="bg-surface rounded-lg p-4 flex flex-col gap-2">
        <a href="/privacy" className="text-accent underline">Privacy Policy</a>
        <a href="/help" className="text-accent underline">Help & Support</a>
      </div>
    </div>
  );
} 