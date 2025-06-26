'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { AlertTriangle, MapPin, Phone, Video, X } from 'lucide-react';

interface EmergencyAlert {
  id: number;
  user_id: string;
  type: string;
  message: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
  video_url?: string;
}

export default function EmergencyNotification() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Subscribe to new emergency alerts
    const channel = supabase.channel('emergency-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'emergency_alerts',
        filter: 'status=eq.active'
      }, (payload) => {
        const newAlert = payload.new as EmergencyAlert;
        setAlerts(prev => [newAlert, ...prev]);
        setShowNotifications(true);
        
        // Play notification sound
        const audio = new Audio('/alert.mp3');
        audio.play().catch(() => {
          // Fallback to browser notification sound
          console.log('Emergency alert received!');
        });
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Emergency Alert', {
            body: newAlert.message,
            icon: '/alert-icon.png',
            tag: `alert-${newAlert.id}`,
            requireInteraction: true
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleRespond = async (alertId: number) => {
    try {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'responding' })
        .eq('id', alertId);
      
      // Remove from notifications
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error responding to alert:', error);
    }
  };

  const dismissAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'SOS':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'video':
        return <Video className="text-blue-500" size={20} />;
      default:
        return <MapPin className="text-yellow-500" size={20} />;
    }
  };

  if (!showNotifications || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-red-600 text-white p-4 rounded-lg shadow-lg border border-red-500 animate-slide-in"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getAlertIcon(alert.type)}
              <span className="font-bold">
                {alert.type === 'SOS' ? 'SOS ALERT' : 'Emergency Alert'}
              </span>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          
          <p className="text-sm mb-3">{alert.message}</p>
          
          <div className="flex items-center gap-2 text-xs text-white/80 mb-3">
            <MapPin size={12} />
            <span>{alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleRespond(alert.id)}
              className="bg-white text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-white/90 flex items-center gap-1"
            >
              <Phone size={14} />
              Respond Now
            </button>
            
            {alert.video_url && (
              <a
                href={alert.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <Video size={14} />
                View Video
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 