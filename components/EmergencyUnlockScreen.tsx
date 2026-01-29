'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { AlertTriangle, Heart, MapPin, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyProfile {
  id: string;
  blood_type?: string;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medications?: string;
  insurance_provider?: string;
  insurance_id?: string;
  created_at?: string;
}

interface EmergencyUnlockScreenProps {
  onEmergencySOS: (profile: EmergencyProfile | null) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ✅ EMERGENCY UNLOCK SCREEN
 * Shows emergency profile info when triggered by:
 * - Shake detection on locked phone
 * - Volume Up on locked phone
 * - No unlock pattern needed!
 *
 * User can see:
 * - Blood type
 * - Medical conditions
 * - Allergies
 * - Emergency contacts
 * - Insurance info
 *
 * Then send SOS with single tap
 */
export default function EmergencyUnlockScreen({
  onEmergencySOS,
  isLoading = false,
}: EmergencyUnlockScreenProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch emergency profile on mount
  useEffect(() => {
    const fetchEmergencyProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, blood_type, allergies, medical_conditions, emergency_contact_name, emergency_contact_phone, medications, insurance_provider, insurance_id, created_at'
          )
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching emergency profile:', error);
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error('Emergency profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyProfile();
  }, [user?.id]);

  const handleSOS = async () => {
    try {
      await onEmergencySOS(profile);
    } catch (err) {
      console.error('SOS error:', err);
      toast.error('Failed to send emergency alert');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-red-950 via-slate-900 to-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="bg-red-600 text-white p-6 flex items-center gap-3 shadow-lg">
        <AlertTriangle size={32} className="animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold">🆘 EMERGENCY MODE</h1>
          <p className="text-sm text-red-100">
            Your emergency profile is displayed below
          </p>
        </div>
      </div>

      {/* Emergency Profile Info */}
      <div className="p-6 space-y-4">
        {/* Blood Type - Most Important */}
        {profile?.blood_type && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Heart size={32} className="text-red-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">
                  Blood Type
                </p>
                <p className="text-2xl font-bold text-red-300">
                  {profile.blood_type}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {profile?.medical_conditions && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-400" />
              Medical Conditions
            </h3>
            <p className="text-sm text-gray-200">{profile.medical_conditions}</p>
          </div>
        )}

        {/* Allergies */}
        {profile?.allergies && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-orange-300 mb-2">
              ⚠️ Allergies
            </h3>
            <p className="text-sm text-gray-200">{profile.allergies}</p>
          </div>
        )}

        {/* Medications */}
        {profile?.medications && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              💊 Medications
            </h3>
            <p className="text-sm text-gray-200">{profile.medications}</p>
          </div>
        )}

        {/* Emergency Contact */}
        {(profile?.emergency_contact_name || profile?.emergency_contact_phone) && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Phone size={16} />
              Emergency Contact
            </h3>
            {profile?.emergency_contact_name && (
              <p className="text-sm text-gray-200">
                <strong>{profile.emergency_contact_name}</strong>
              </p>
            )}
            {profile?.emergency_contact_phone && (
              <p className="text-sm text-green-300 font-mono">
                {profile.emergency_contact_phone}
              </p>
            )}
          </div>
        )}

        {/* Insurance Info */}
        {(profile?.insurance_provider || profile?.insurance_id) && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              🏥 Insurance
            </h3>
            {profile?.insurance_provider && (
              <p className="text-sm text-gray-200">
                Provider: <strong>{profile.insurance_provider}</strong>
              </p>
            )}
            {profile?.insurance_id && (
              <p className="text-sm text-gray-200">
                ID: <span className="font-mono">{profile.insurance_id}</span>
              </p>
            )}
          </div>
        )}

        {/* No Profile Info */}
        {!profile?.blood_type &&
          !profile?.medical_conditions &&
          !profile?.allergies && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">
                ℹ️ No emergency profile data saved
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Go to Settings → Profile to add medical information
              </p>
            </div>
          )}
      </div>

      {/* Sticky SOS Button at Bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-6 border-t border-red-500/30">
        <button
          onClick={handleSOS}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <span>Sending SOS...</span>
            </>
          ) : (
            <>
              <AlertTriangle size={28} className="animate-bounce" />
              <span>🚨 SEND EMERGENCY ALERT NOW</span>
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-500 mt-3">
          Responders will see your profile & location
        </p>
      </div>
    </div>
  );
}
