'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ContactLocationMapProps {
  contact?: {
    id: string;
    full_name: string;
    latitude?: number;
    longitude?: number;
  };
  className?: string;
}

export default function ContactLocationMap({
  contact,
  className = '',
}: ContactLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const contactMarkerRef = useRef<L.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ FIX: Initialize map only once with proper guards
  useEffect(() => {
    if (isInitialized || !mapRef.current) return;

    try {
      // Fix Leaflet default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const defaultCoords = [40.7128, -74.006] as [number, number];

      // Create map only if not already created
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: defaultCoords,
          zoom: 12,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      setIsInitialized(true);
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  }, [isInitialized]);

  // Get user location
  useEffect(() => {
    if (!isInitialized || !mapInstanceRef.current) return;

    // Only on client side
    if (typeof window === 'undefined') return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const coords = [latitude, longitude] as [number, number];
            setUserLocation(coords);

            // Update map view if initialized
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView(coords, 13);
            }

            // Add or update user marker
            if (userMarkerRef.current && mapInstanceRef.current) {
              mapInstanceRef.current.removeLayer(userMarkerRef.current);
            }

            userMarkerRef.current = L.circleMarker(coords, {
              radius: 8,
              fillColor: '#3B82F6',
              color: '#1E40AF',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            });

            if (mapInstanceRef.current && userMarkerRef.current) {
              userMarkerRef.current.addTo(mapInstanceRef.current);
              userMarkerRef.current.bindPopup('📍 Your Location');
            }
          } catch (err) {
            console.error('Error updating user location:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUserLocation([40.7128, -74.006]);
        }
      );
    }
  }, [isInitialized]);

  // ✅ FIX: Add contact marker with safe operations
  useEffect(() => {
    if (!mapInstanceRef.current || !contact || !isInitialized) return;

    try {
      const { latitude, longitude } = contact;

      if (!latitude || !longitude) return;

      // Remove old contact marker
      if (contactMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(contactMarkerRef.current);
      }

      // Add new contact marker
      contactMarkerRef.current = L.marker([latitude, longitude], {
        icon: L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          shadowSize: [41, 41],
        }),
      })
        .bindPopup(`<b>👤 ${contact.full_name}</b>`)
        .addTo(mapInstanceRef.current);

      // Fit bounds to show both markers
      if (userLocation && mapInstanceRef.current) {
        const group = new L.FeatureGroup([
          L.marker(userLocation),
          L.marker([latitude, longitude]),
        ]);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }

      // ✅ SAFE: Invalidate size after marker updates
      setTimeout(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch (err) {
            console.error('Error invalidating size:', err);
          }
        }
      }, 100);
    } catch (err) {
      console.error('Error adding contact marker:', err);
    }
  }, [contact, userLocation, isInitialized]);

  return (
    <div
      ref={mapRef}
      className={`w-full bg-gray-200 rounded-lg overflow-hidden ${className}`}
      role="region"
      aria-label="Contact location map"
      style={{ minHeight: '400px' }}
    />
  );
}
