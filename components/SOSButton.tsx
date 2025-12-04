'use client';
import { useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface SOSButtonProps {
  onSOS?: () => void;
  alertType?: string;
  message?: string;
  location?: [number, number] | null;
  autoSend?: boolean;
}

export default function SOSButton({
  onSOS,
  alertType = 'SOS',
  message = 'SOS alert triggered via emergency button',
  location,
  autoSend = true,
}: SOSButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getLocation = useCallback(async () => {
    if (location) return location;
    if (!navigator.geolocation) return null;
    return new Promise<[number, number] | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [location]);

  const sendSOSAlert = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please sign in before sending an SOS alert.');
      throw new Error('Unauthenticated');
    }
    const coords = await getLocation();
    if (!coords) {
      toast.warning('Location unavailable. Sending SOS without coordinates.');
    }
    const payload = {
      user_id: user.id,
      type: alertType,
      lat: coords?.[0] ?? null,
      lng: coords?.[1] ?? null,
      message,
      status: 'active',
    };
    const { error } = await supabase.from('emergency_alerts').insert(payload);
    if (error) {
      toast.error('Failed to send SOS alert.');
      throw error;
    }
    toast.success('SOS alert sent. Responders are on the way.');
  }, [alertType, getLocation, message, user?.id]);

  const handleSOS = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Play alarm sound
      const audio = new Audio('/alarm.mp3');
      audio.play().catch(() => {
        console.warn('Unable to play SOS alarm sound');
      });

      // Vibrate pattern
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);

      if (autoSend) {
        await sendSOSAlert();
      }

      // Notify parent (e.g., to open modals)
      onSOS?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSOS}
      disabled={loading}
      aria-label="Activate SOS"
      className={`w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300 
        border-4 focus:outline-none focus:ring-4 focus:ring-red-500/50 
        ${loading ? 'bg-red-400 border-red-400' : 'bg-red-600 border-red-600 hover:bg-red-700'}
      `}
    >
      {loading ? (
        <div className="animate-pulse">Sending...</div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <AlertTriangle size={28} className="animate-bounce" />
          <span>SOS</span>
        </div>
      )}
    </button>
  );
} 