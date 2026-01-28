'use client';

import { useEffect, useState } from 'react';
import { Bell, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Notification Settings Component
 * Allows users to customize notification preferences
 * - Enable/disable all notifications
 * - Enable/disable by responder type
 * - Set location radius for alerts
 */

export interface NotificationSettings {
  id?: string;
  user_id: string;
  receive_all_notifications: boolean;
  notify_police: boolean;
  notify_fire: boolean;
  notify_medical: boolean;
  notify_rescue: boolean;
  alert_radius_km: number;
  enable_sound: boolean;
  enable_vibration: boolean;
  enable_popup: boolean;
}

const RESPONDER_TYPES = [
  { id: 'police', label: '🚔 Police', color: 'blue' },
  { id: 'fire', label: '🚒 Fire Department', color: 'red' },
  { id: 'medical', label: '🚑 Medical/Ambulance', color: 'green' },
  { id: 'rescue', label: '🛟 Rescue/Recovery', color: 'yellow' },
];

export default function NotificationSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<NotificationSettings>({
    user_id: userId,
    receive_all_notifications: true,
    notify_police: true,
    notify_fire: true,
    notify_medical: true,
    notify_rescue: true,
    alert_radius_km: 5,
    enable_sound: true,
    enable_vibration: true,
    enable_popup: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      setError(null);

      const { error: saveError } = await supabase
        .from('notification_settings')
        .upsert(
          {
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (saveError) {
        throw saveError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof NotificationSettings],
    }));
  };

  const handleRadiusChange = (value: string) => {
    const radius = Math.max(1, Math.min(50, parseInt(value) || 5));
    setSettings((prev) => ({
      ...prev,
      alert_radius_km: radius,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-red-500" />
        <h2 className="text-xl font-bold text-white">Notification Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Master Toggle */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">All Notifications</p>
              <p className="text-xs text-slate-400 mt-1">
                Master control for all notification types
              </p>
            </div>
            <button
              onClick={() => toggleSetting('receive_all_notifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                settings.receive_all_notifications
                  ? 'bg-red-500'
                  : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.receive_all_notifications
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Responder Type Toggles */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-3">
            Responder Types
          </p>
          <div className="space-y-2">
            {RESPONDER_TYPES.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition"
              >
                <label className="cursor-pointer text-sm text-slate-300">
                  {type.label}
                </label>
                <button
                  onClick={() =>
                    toggleSetting(
                      `notify_${type.id}` as keyof NotificationSettings
                    )
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    settings[`notify_${type.id}` as keyof NotificationSettings]
                      ? 'bg-red-500'
                      : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                      settings[
                        `notify_${type.id}` as keyof NotificationSettings
                      ]
                        ? 'translate-x-5'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Radius */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium text-slate-300">Alert Radius</p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="50"
                value={settings.alert_radius_km}
                onChange={(e) => handleRadiusChange(e.target.value)}
                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-right min-w-fit">
                <span className="text-lg font-bold text-white">
                  {settings.alert_radius_km}
                </span>
                <p className="text-xs text-slate-400">km</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Only receive alerts for emergencies within this radius
            </p>
          </div>
        </div>

        {/* Audio/Vibration/Popup */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-3">
            Alert Behavior
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <label className="cursor-pointer text-sm text-slate-300">
                🔊 Sound
              </label>
              <button
                onClick={() => toggleSetting('enable_sound')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  settings.enable_sound ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    settings.enable_sound
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <label className="cursor-pointer text-sm text-slate-300">
                📳 Vibration
              </label>
              <button
                onClick={() => toggleSetting('enable_vibration')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  settings.enable_vibration ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    settings.enable_vibration
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <label className="cursor-pointer text-sm text-slate-300">
                💬 Popup
              </label>
              <button
                onClick={() => toggleSetting('enable_popup')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  settings.enable_popup ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    settings.enable_popup
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="flex items-start gap-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-green-300 text-sm">
              Settings saved successfully!
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}
