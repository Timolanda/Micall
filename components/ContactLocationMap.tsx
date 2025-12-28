'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useAuth } from '@/hooks/useAuth';
import { getTrackedUsers, formatLastUpdate, calculateDistance } from '@/utils/locationSharingUtils';
import { MapPin, RefreshCw, Users } from 'lucide-react';

interface ContactLocationMapProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Map component showing locations of all tracked users
 * (users who have location sharing enabled)
 */
export default function ContactLocationMap({
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
}: ContactLocationMapProps) {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [trackedUsers, setTrackedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default location (New York)
    const defaultCoords = [40.7128, -74.006] as [number, number];

    mapInstanceRef.current = L.map(mapRef.current, {
      center: defaultCoords,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 10,
      maxZoom: 18,
    }).addTo(mapInstanceRef.current);

    // Get user's own location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          mapInstanceRef.current.setView([latitude, longitude], 13);

          // Add user marker
          L.circleMarker([latitude, longitude], {
            radius: 10,
            fillColor: '#3b82f6',
            color: '#1e40af',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .bindPopup('<p className="font-bold">Your Location</p>')
            .addTo(mapInstanceRef.current);
        },
        () => {
          // Geolocation error - use default
          mapInstanceRef.current.setView(defaultCoords, 12);
        }
      );
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Load tracked users
  const loadTrackedUsers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const users = await getTrackedUsers(user.id);
      setTrackedUsers(users);

      // Update markers on map
      if (mapInstanceRef.current) {
        // Clear old markers
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        // Add new markers
        users.forEach((trackedUser) => {
          if (trackedUser.location && userLocation) {
            const { latitude, longitude } = trackedUser.location;
            const distance = calculateDistance(
              userLocation[0],
              userLocation[1],
              latitude,
              longitude
            );

            const marker = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: '#22c55e',
              color: '#16a34a',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }).addTo(mapInstanceRef.current);

            const popupContent = `
              <div className="text-sm">
                <p className="font-bold">${trackedUser.full_name}</p>
                <p className="text-xs text-gray-600">${distance.toFixed(1)} km away</p>
                <p className="text-xs text-gray-500">${formatLastUpdate(trackedUser.location.updated_at)}</p>
              </div>
            `;

            marker.bindPopup(popupContent);
            markersRef.current.set(trackedUser.id, marker);
          }
        });
      }
    } catch (error) {
      console.error('Error loading tracked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTrackedUsers();
  }, [user]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadTrackedUsers, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Tracked Locations</h3>
            <p className="text-sm text-gray-500">
              {trackedUsers.length} {trackedUsers.length === 1 ? 'contact' : 'contacts'} sharing
              location
            </p>
          </div>
        </div>

        <button
          onClick={loadTrackedUsers}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      />

      {/* Info Section */}
      {trackedUsers.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 space-y-3">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared Locations
          </h4>
          <div className="space-y-2">
            {trackedUsers.map((trackedUser) => {
              const distance =
                userLocation && trackedUser.location
                  ? calculateDistance(
                      userLocation[0],
                      userLocation[1],
                      trackedUser.location.latitude,
                      trackedUser.location.longitude
                    )
                  : null;

              return (
                <div
                  key={trackedUser.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{trackedUser.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatLastUpdate(trackedUser.location.updated_at)}
                    </p>
                  </div>
                  {distance !== null && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {distance.toFixed(1)} km
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-600 font-medium">No shared locations</p>
          <p className="text-sm text-gray-500 mt-1">
            Your emergency contacts who have location sharing enabled will appear here
          </p>
        </div>
      )}
    </div>
  );
}
