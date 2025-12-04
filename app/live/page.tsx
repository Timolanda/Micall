'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { MapPin, Phone, Video, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ResponderDashboard() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [responderLocation, setResponderLocation] = useState<[number, number] | null>(null);

  // Get responder location
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setResponderLocation(coords);
        updateResponderLocation(coords);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update responder location in database
  const updateResponderLocation = async (coords: [number, number]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (userId) {
        await supabase.from('responders').upsert({
          id: userId,
          lat: coords[0],
          lng: coords[1],
          available: true,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating responder location:', error);
    }
  };

  // Fetch emergency alerts near the responder
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        if (responderLocation) {
          const { data, error } = await supabase.rpc('get_nearby_alerts', {
            lat: responderLocation[0],
            lng: responderLocation[1],
            radius_km: 1,
          });

          if (!error && data) {
            setAlerts(data as EmergencyAlert[]);
          } else if (error) {
            toast.error('Failed to load nearby alerts.');
          }
        } else {
          const { data, error } = await supabase
            .from('emergency_alerts')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (!error && data) {
            setAlerts(data as EmergencyAlert[]);
          } else if (error) {
            toast.error('Failed to load alerts.');
          }
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
        toast.error('Unexpected error loading alerts.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Subscribe to real-time updates and keep list in sync
    const channel = supabase
      .channel('emergency-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts',
        },
        (payload) => {
          setAlerts((prev) => {
            const next = [...prev];
            if (payload.eventType === 'INSERT') {
              const alert = payload.new as EmergencyAlert;
              return [alert, ...next];
            }
            if (payload.eventType === 'UPDATE') {
              return next.map((alert) =>
                alert.id === payload.new.id ? (payload.new as EmergencyAlert) : alert
              );
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [responderLocation]);

  const handleRespond = async (alertId: number) => {
    try {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'responding' })
        .eq('id', alertId);
      toast.success('Marked alert as responding.');
    } catch (error) {
      console.error('Error responding to alert:', error);
      toast.error('Failed to update alert status.');
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);
      toast.success('Alert resolved.');
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert.');
    }
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

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'SOS':
        return 'border-red-500 bg-red-500/10';
      case 'video':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-yellow-500 bg-yellow-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading emergency alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Emergency Response Dashboard</h1>
          <p className="text-zinc-400">Monitor and respond to emergency alerts in real-time</p>
        </div>

        {/* Responder Status */}
        {responderLocation && (
          <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">Online & Available</span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Location: {responderLocation[0].toFixed(4)}, {responderLocation[1].toFixed(4)}
            </p>
          </div>
        )}

        {/* Emergency Alerts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Emergency Alerts ({alerts.length})</h2>
          
          {alerts.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl p-8 text-center">
              <AlertTriangle size={48} className="text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No active emergency alerts</p>
              <p className="text-sm text-zinc-500 mt-2">You&rsquo;ll be notified when new alerts come in</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`bg-zinc-900 rounded-xl p-4 border-l-4 ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {alert.type === 'SOS' ? 'SOS ALERT' : 'Emergency Alert'}
                        </h3>
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                          {alert.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-300 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </span>
                        <span>
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {alert.video_url && (
                        <div className="mt-2">
                          <a 
                            href={alert.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            <Video size={14} />
                            View Emergency Video
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => handleRespond(alert.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <Phone size={14} />
                        Respond
                      </button>
                    )}
                    {alert.status === 'responding' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <CheckCircle size={14} />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 