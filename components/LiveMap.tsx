'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveMapProps {
  victimLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  responders?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    full_name: string;
  }>;
  className?: string;
}

export default function LiveMap({
  victimLocation,
  responders = [],
  className = '',
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker | L.CircleMarker }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize map only once
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

      // Create map only if container is ready
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [20, 0],
          zoom: 2,
          zoomControl: true,
          attributionControl: true,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 2,
        }).addTo(mapInstanceRef.current);
      }

      setIsInitialized(true);
    } catch (err) {
      console.error('Error initializing map:', err);
    }

    return () => {
      // Keep map for reuse
    };
  }, [isInitialized]);

  // Update victim marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitialized || !victimLocation) return;

    try {
      // Remove old victim marker
      if (markersRef.current['victim']) {
        mapInstanceRef.current.removeLayer(markersRef.current['victim']);
      }

      // Add new victim marker
      const victimMarker = L.marker(
        [victimLocation.latitude, victimLocation.longitude],
        {
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            shadowSize: [41, 41],
          }),
        }
      )
        .bindPopup(`<b>🚨 ${victimLocation.name || 'Emergency Location'}</b>`)
        .addTo(mapInstanceRef.current);

      markersRef.current['victim'] = victimMarker;

      // Center map on victim
      mapInstanceRef.current.flyTo(
        [victimLocation.latitude, victimLocation.longitude],
        13,
        {
          duration: 1,
        }
      );
    } catch (err) {
      console.error('Error updating victim marker:', err);
    }
  }, [victimLocation, isInitialized]);

  // Update responder markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitialized) return;

    try {
      // Clear old responder markers
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith('responder-')) {
          mapInstanceRef.current?.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });

      // Add new responder markers
      responders.forEach((responder) => {
        const responderMarker = L.marker(
          [responder.latitude, responder.longitude],
          {
            icon: L.icon({
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
              iconSize: [20, 35],
              iconAnchor: [10, 35],
              popupAnchor: [1, -28],
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              shadowSize: [41, 41],
            }),
          }
        )
          .bindPopup(`<b>👤 ${responder.full_name}</b><br/>Responding`)
          .addTo(mapInstanceRef.current!);

        markersRef.current[`responder-${responder.id}`] = responderMarker;
      });

      // Invalidate size
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
      console.error('Error updating responder markers:', err);
    }
  }, [responders, isInitialized]);

  return (
    <div
      ref={mapRef}
      className={`w-full bg-gray-200 rounded-lg overflow-hidden ${className}`}
      role="region"
      aria-label="Emergency response map"
      style={{ minHeight: '300px' }}
    />
  );
}
