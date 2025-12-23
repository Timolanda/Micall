'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LatLngExpression, Icon, latLng } from 'leaflet';
import L from 'leaflet';
import { Phone, Navigation, MapPin, Clock, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import { getNavigationInfo } from '@/utils/navigationUtils';

interface AlertData {
  id: number;
  lat: number;
  lng: number;
  type: string;
  message: string;
  created_at: string;
  video_url?: string;
  user_id?: string;
}

interface ResponderNavProps {
  alert: AlertData;
  responderLat: number;
  responderLng: number;
  onClose: () => void;
  onStatusChange?: (status: 'en_route' | 'on_scene' | 'complete') => void;
}

// Custom icons
const victimIcon = new Icon({
  iconUrl:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23dc2626"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="%23fff"/></svg>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const responderIcon = new Icon({
  iconUrl:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322c55e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

export default function ResponderNavigationView({
  alert,
  responderLat,
  responderLng,
  onClose,
  onStatusChange,
}: ResponderNavProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [status, setStatus] = useState<'en_route' | 'on_scene' | 'complete'>('en_route');
  const [navInfo, setNavInfo] = useState(
    getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng)
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const responderCoords = latLng(responderLat, responderLng);

    mapInstanceRef.current = L.map(mapRef.current, {
      center: responderCoords,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 10,
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    // Add victim marker
    L.marker(latLng(alert.lat, alert.lng), { icon: victimIcon })
      .bindPopup(
        `<div class="text-sm"><p class="font-bold">Emergency Location</p><p class="text-red-600">${alert.message}</p></div>`
      )
      .addTo(mapInstanceRef.current);

    // Add responder marker
    L.marker(responderCoords, { icon: responderIcon })
      .bindPopup('<div class="text-sm"><p class="font-bold">Your Location</p></div>')
      .addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [alert.lat, alert.lng, alert.message, responderLat, responderLng]);

  // Update navigation info and map
  useEffect(() => {
    const newNavInfo = getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng);
    setNavInfo(newNavInfo);

    // Update responder marker position
    if (mapInstanceRef.current) {
      const responderCoords = latLng(responderLat, responderLng);
      mapInstanceRef.current.setView(responderCoords, 15);
    }
  }, [responderLat, responderLng, alert.lat, alert.lng]);

  const handleStatusChange = useCallback(
    async (newStatus: 'en_route' | 'on_scene' | 'complete') => {
      try {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      } catch (error) {
        toast.error('Failed to update status');
        console.error(error);
      }
    },
    [onStatusChange]
  );

  const handleCall = () => {
    // Open phone dialer
    const phoneNumber = 'tel:911';
    window.location.href = phoneNumber;
  };

  const handleOpenInMaps = () => {
    // Open in Google Maps
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition"
        aria-label="Close navigation"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      {/* Map Section */}
      <div className="flex-1 relative" ref={mapRef} />

      {/* Top Right Info Card */}
      <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg p-4 max-w-xs space-y-3">
        {/* Distance and ETA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Distance</span>
            <span className="text-lg font-bold text-blue-600">{navInfo.distanceKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">ETA</span>
            <span className="text-lg font-bold text-green-600">{navInfo.etaTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Direction</span>
            <span className="text-lg font-bold text-purple-600">{navInfo.direction}</span>
          </div>
        </div>

        {/* Status Selector */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Status</p>
          <div className="flex gap-2 flex-wrap">
            {(['en_route', 'on_scene', 'complete'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  status === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'en_route' ? '🔵 Route' : s === 'on_scene' ? '🟢 Scene' : '✅ Done'}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Info */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Alert Details</p>
          <p className="text-sm text-gray-900 font-medium">{alert.type}</p>
          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white border-t border-gray-200 p-6 space-y-3">
        <div className="flex gap-3">
          {/* Call Button */}
          <button
            onClick={handleCall}
            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
          >
            <Phone className="w-5 h-5" />
            Call Victim
          </button>

          {/* Navigation Button */}
          <button
            onClick={handleOpenInMaps}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
          >
            <Navigation className="w-5 h-5" />
            Open Maps
          </button>
        </div>

        {/* Video Button (if available) */}
        {alert.video_url && (
          <button
            onClick={() => window.open(alert.video_url, '_blank')}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
          >
            📹 View Live Video
          </button>
        )}

        {/* Complete Button */}
        <button
          onClick={() => handleStatusChange('complete')}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
        >
          <CheckCircle2 className="w-5 h-5" />
          Mark as Complete
        </button>
      </div>
    </div>
  );
}
