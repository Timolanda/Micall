'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationStatus {
  status: 'idle' | 'tracking' | 'error' | 'permission-denied';
  message: string;
  location?: UserLocation;
}

export default function LocationSharing() {
  const { user } = useAuth();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>({
    status: 'idle',
    message: 'Click to start sharing location',
  });
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Request location permission
  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationStatus({
        status: 'error',
        message: 'Geolocation not supported on this device',
      });
      toast.error('Geolocation not supported');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocationStatus({
            status: 'tracking',
            message: 'Location permission granted',
            location: {
              latitude,
              longitude,
              accuracy,
              timestamp: Date.now(),
            },
          });
          toast.success('Location permission granted');
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus({
              status: 'permission-denied',
              message: 'Location permission denied. Please enable in settings.',
            });
            toast.error('Location permission denied');
          } else {
            setLocationStatus({
              status: 'error',
              message: `Error: ${error.message}`,
            });
            toast.error(`Location error: ${error.message}`);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      setLocationStatus({
        status: 'error',
        message: 'Failed to get location',
      });
      toast.error('Failed to get location');
    }
  };

  // Start continuous location tracking
  const startLocationTracking = async () => {
    if (!user) {
      setLocationStatus({
        status: 'error',
        message: 'User not authenticated',
      });
      toast.error('Please sign in first');
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus({
        status: 'error',
        message: 'Geolocation not supported',
      });
      toast.error('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    setLocationStatus({
      status: 'tracking',
      message: 'Starting location tracking...',
    });

    try {
      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLocation: UserLocation = {
            latitude,
            longitude,
            accuracy,
            timestamp: Date.now(),
          };

          setLocationStatus({
            status: 'tracking',
            message: `Location tracked (±${Math.round(accuracy)}m)`,
            location: newLocation,
          });

          // Broadcast location to Supabase in real-time
          try {
            const { error } = await supabase.from('user_locations').upsert({
              user_id: user.id,
              latitude,
              longitude,
              accuracy,
              updated_at: new Date().toISOString(),
            });

            if (error) {
              console.error('Error updating location:', error);
            }
          } catch (err) {
            console.error('Supabase update error:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus({
            status: 'error',
            message: `Location error: ${error.message}`,
          });
          stopLocationTracking();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      toast.success('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationStatus({
        status: 'error',
        message: 'Failed to start tracking',
      });
      setIsTracking(false);
      toast.error('Failed to start tracking');
    }
  };

  // Stop location tracking
  const stopLocationTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    setLocationStatus({
      status: 'idle',
      message: 'Location tracking stopped',
    });

    // Clear location from database
    if (user) {
      try {
        await supabase.from('user_locations').delete().eq('user_id', user.id);
        toast.success('Location tracking stopped');
      } catch (error) {
        console.error('Error clearing location:', error);
      }
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopLocationTracking();
      }
    };
  }, [isTracking, stopLocationTracking]);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Location Sharing</h3>
        </div>

        {/* Status Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            {locationStatus.status === 'tracking' && (
              <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
            )}
            {locationStatus.status === 'error' && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {locationStatus.status === 'permission-denied' && (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            {locationStatus.status === 'idle' && (
              <MapPin className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {locationStatus.message}
              </p>
              {locationStatus.location && (
                <p className="text-xs text-gray-600 mt-1">
                  {locationStatus.location.latitude.toFixed(4)}, {locationStatus.location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {!isTracking ? (
            <>
              <button
                onClick={requestLocationPermission}
                className="w-full px-4 py-3 bg-blue-100 text-blue-600 rounded-lg font-semibold hover:bg-blue-200 transition"
              >
                Request Permission
              </button>
              <button
                onClick={startLocationTracking}
                disabled={locationStatus.status === 'permission-denied'}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Sharing Location
              </button>
            </>
          ) : (
            <button
              onClick={stopLocationTracking}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Stop Sharing Location
            </button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your location will be updated in real-time and shared with nearby responders during emergencies.
          This data is private and secure.
        </p>
      </div>
    </div>
  );
}
