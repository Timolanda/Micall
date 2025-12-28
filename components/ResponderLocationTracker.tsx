'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';

interface ResponderLocationTrackerProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export default function ResponderLocationTracker({ onLocationUpdate }: ResponderLocationTrackerProps) {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    // Request location permission
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // Watch position - updates every 5 seconds
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const now = Date.now();

        // Only update if 5+ seconds have passed (to avoid too many updates)
        if (now - lastUpdateRef.current < 5000) {
          return;
        }

        lastUpdateRef.current = now;

        try {
          // Upsert responder location (insert if not exists, update if exists)
          await supabase
            .from('responders')
            .upsert({
              id: user.id,
              lat: latitude,
              lng: longitude,
              updated_at: new Date().toISOString(),
              available: true,
            }, { onConflict: 'id' });

          // Callback for parent component
          if (onLocationUpdate) {
            onLocationUpdate(latitude, longitude);
          }
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to access location. Please enable location permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [user, onLocationUpdate]);

  // This component doesn't render anything visible
  return null;
}
