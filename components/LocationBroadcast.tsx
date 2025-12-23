'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, Radio, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface BroadcastStatus {
  isActive: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  lastUpdated: Date;
  nearbyResponders: number;
  emergencyType?: string;
}

export default function LocationBroadcast() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BroadcastStatus | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`user-location-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new) {
            setStatus({
              isActive: true,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              lastUpdated: new Date(payload.new.updated_at),
              nearbyResponders: 0,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const startBroadcast = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Update user location in database
      const { error } = await supabase.from('user_locations').upsert({
        user_id: user.id,
        latitude,
        longitude,
        accuracy,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      setStatus({
        isActive: true,
        latitude,
        longitude,
        accuracy,
        lastUpdated: new Date(),
        nearbyResponders: 0,
      });

      setIsBroadcasting(true);

      // Start continuous location updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;

          const { error } = await supabase.from('user_locations').upsert({
            user_id: user.id,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            updated_at: new Date().toISOString(),
          });

          if (!error) {
            setStatus({
              isActive: true,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              lastUpdated: new Date(),
              nearbyResponders: 0,
            });
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          toast.error('Failed to track location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      toast.success('Location broadcasting started');
    } catch (error: any) {
      console.error('Error starting broadcast:', error);
      toast.error(error.message || 'Failed to start location broadcasting');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const stopBroadcast = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const { error } = await supabase.from('user_locations').delete().eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setStatus(null);
      setIsBroadcasting(false);
      toast.success('Location broadcasting stopped');
    } catch (error: any) {
      console.error('Error stopping broadcast:', error);
      toast.error('Failed to stop broadcasting');
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Radio className={`w-6 h-6 transition-colors ${isBroadcasting ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-bold text-gray-900">Broadcasting Location</h3>
        </div>
        {isBroadcasting && (
          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            Active
          </span>
        )}
      </div>

      {status && isBroadcasting ? (
        <div className="space-y-4 mb-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">Location Broadcasting Active</p>
              <p className="text-xs text-green-700">
                Sharing with nearby responders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-semibold mb-1">Latitude</p>
              <p className="font-mono font-bold text-gray-900 text-sm">{status.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-semibold mb-1">Longitude</p>
              <p className="font-mono font-bold text-gray-900 text-sm">{status.longitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-semibold mb-1">Accuracy</p>
              <p className="font-mono font-bold text-gray-900 text-sm">±{Math.round(status.accuracy)}m</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600 text-xs font-semibold mb-1">Updated</p>
              <p className="font-mono font-bold text-gray-900 text-sm">
                {status.lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 animate-pulse" />
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Real-time tracking active</span> - Location updates every few seconds
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          Share your location with nearby responders for faster help during emergencies. Your location is private and only shared when needed.
        </p>
      )}

      <button
        onClick={isBroadcasting ? stopBroadcast : startBroadcast}
        disabled={isLoading}
        className={`w-full px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${
          isBroadcasting
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {isBroadcasting ? 'Stopping...' : 'Starting...'}
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
          </>
        )}
      </button>
    </div>
  );
}
