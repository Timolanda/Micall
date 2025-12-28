'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import { isLocationSharingEnabled } from '@/utils/locationSharingUtils';

interface ContactLocationTrackerProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
}

/**
 * Background component that tracks and updates user location
 * Only updates when location sharing is enabled
 */
export default function ContactLocationTracker({
  onLocationUpdate,
}: ContactLocationTrackerProps) {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const sharingEnabledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user) return;

    // Check if location sharing is enabled periodically (every 30 seconds)
    const checkSharingInterval = setInterval(async () => {
      const enabled = await isLocationSharingEnabled(user.id);
      sharingEnabledRef.current = enabled;
    }, 30000);

    // Initial check
    isLocationSharingEnabled(user.id).then((enabled) => {
      sharingEnabledRef.current = enabled;
    });

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // Watch position - updates every location change
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // Only update if 5+ seconds have passed AND location sharing is enabled
        if (now - lastUpdateRef.current < 5000 || !sharingEnabledRef.current) {
          return;
        }

        lastUpdateRef.current = now;

        try {
          // Update location in database
          await supabase
            .from('user_locations')
            .upsert(
              {
                user_id: user.id,
                latitude,
                longitude,
                accuracy,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );

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
        if (error.code === error.PERMISSION_DENIED) {
          console.error('Location permission denied');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(checkSharingInterval);
    };
  }, [user, onLocationUpdate]);

  // This component doesn't render anything
  return null;
}
