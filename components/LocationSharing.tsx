/** @jsxImportSource react */
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface ShareLocationResponse {
  status: 'success' | 'error';
  message: string;
  contactsNotified?: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

const LocationSharing: React.FC = () => {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query for emergency contacts with better typing
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<EmergencyContact[]>({
    queryKey: ['emergencyContacts'],
    queryFn: async () => {
      const response = await fetch('/api/emergency-contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    retry: 2,
    staleTime: 30000,
  });

  // Mutation for sharing location with better error handling
  const { mutate: shareLocation } = useMutation<ShareLocationResponse, Error, LocationData>({
    mutationFn: async (location) => {
      const response = await fetch('/api/share-location', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          location,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to share location');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.contactsNotified) {
        toast.success(`Location shared with ${data.contactsNotified} contacts`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to share location');
      console.error('Error sharing location:', error);
    },
  });

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    setError(error.message);
    setIsSharing(false);
    setLocation(null);
    toast.error(`Location error: ${error.message}`);
  }, []);

  const startLocationSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('Geolocation is not supported');
      return;
    }

    setError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const userLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };
        
        setLocation(userLocation);
        setIsSharing(true);
        shareLocation(userLocation);
      },
      handleLocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    setWatchId(id);
  }, [shareLocation, handleLocationError]);

  const stopLocationSharing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsSharing(false);
    setLocation(null);
    toast.info('Location sharing stopped');
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="space-y-4">
      {/* Location Sharing Button */}
      <button
        type="button"
        onClick={isSharing ? stopLocationSharing : startLocationSharing}
        disabled={!!error}
        className={`
          w-full py-3 px-4 rounded-lg font-medium text-white
          inline-flex items-center justify-center gap-2 transition-colors
          ${error ? 'bg-gray-400 cursor-not-allowed' : 
            isSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
        `}
      >
        {isSharing ? (
          <>
            <MapPin className="h-5 w-5" />
            Stop Sharing Location
          </>
        ) : (
          <>
            {error ? <AlertTriangle className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            {error ? 'Location Unavailable' : 'Start Sharing Location'}
          </>
        )}
      </button>

      {/* Location Status */}
      {isSharing && location && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Actively Sharing Location</span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Latitude: {location.latitude.toFixed(6)}
              <br />
              Longitude: {location.longitude.toFixed(6)}
            </p>
            
            {location.accuracy && (
              <p>Accuracy: ±{Math.round(location.accuracy)}m</p>
            )}
            
            {location.altitude && (
              <p>Altitude: {Math.round(location.altitude)}m</p>
            )}
            
            {location.speed && (
              <p>Speed: {Math.round(location.speed * 3.6)}km/h</p>
            )}
            
            <p className="text-xs text-gray-500">
              Last Updated: {new Date(location.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {contacts.length > 0 && (
            <p className="text-xs text-gray-500">
              Sharing with {contacts.length} emergency contacts
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Location Error</span>
          </div>
          <p className="mt-1 text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LocationSharing; 