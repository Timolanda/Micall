'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Navigation, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import { getNavigationInfo } from '@/utils/navigationUtils';
import 'leaflet/dist/leaflet.css';

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
  responderCount?: number;
  liveStatus?: 'LIVE' | 'Responding' | 'Completed';
}

export default function ResponderNavigationView({
  alert,
  responderLat,
  responderLng,
  onClose,
  onStatusChange,
  responderCount = 0,
  liveStatus = 'Responding',
}: ResponderNavProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [status, setStatus] = useState<'en_route' | 'on_scene' | 'complete'>('en_route');
  const [navInfo, setNavInfo] = useState(
    getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng)
  );
  const [isClient, setIsClient] = useState(false);

  /** ---------------- CLIENT CHECK ---------------- */
  useEffect(() => {
    setIsClient(true);
  }, []);

  /** ---------------- CREATE ICONS ---------------- */
  const createIcons = useCallback((L: any) => {
    const victimIcon = new L.Icon({
      iconUrl:
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23dc2626"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="%23fff"/></svg>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    const responderIcon = new L.Icon({
      iconUrl:
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322c55e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    return { victimIcon, responderIcon };
  }, []);

  /** ---------------- INITIALIZE MAP ---------------- */
  const initializeMap = useCallback(async () => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    try {
      const L = await import('leaflet');
      leafletRef.current = L;

      const { victimIcon, responderIcon } = createIcons(L);
      const responderCoords = L.latLng(responderLat, responderLng);

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

      L.marker(L.latLng(alert.lat, alert.lng), { icon: victimIcon })
        .bindPopup(
          `<div class="text-sm"><p class="font-bold">Emergency Location</p><p class="text-red-600">${alert.message}</p></div>`
        )
        .addTo(mapInstanceRef.current);

      L.marker(responderCoords, { icon: responderIcon })
        .bindPopup('<div class="text-sm"><p class="font-bold">Your Location</p></div>')
        .addTo(mapInstanceRef.current);
    } catch (err) {
      console.error('Map initialization failed', err);
    }
  }, [isClient, alert.lat, alert.lng, alert.message, responderLat, responderLng, createIcons]);

  useEffect(() => {
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initializeMap]);

  /** ---------------- UPDATE NAVIGATION ---------------- */
  useEffect(() => {
    const newNav = getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng);
    setNavInfo(newNav);

    if (mapInstanceRef.current && leafletRef.current) {
      mapInstanceRef.current.setView(leafletRef.current.latLng(responderLat, responderLng), 15);
    }
  }, [responderLat, responderLng, alert.lat, alert.lng]);

  /** ---------------- STATUS CHANGE ---------------- */
  const handleStatusChange = useCallback(
    async (newStatus: 'en_route' | 'on_scene' | 'complete') => {
      try {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      } catch (err) {
        toast.error('Failed to update status');
        console.error(err);
      }
    },
    [onStatusChange]
  );

  /** ---------------- CALL / NAVIGATION ---------------- */
  const handleCall = () => (window.location.href = 'tel:911');
  const handleOpenMaps = () => window.open(`https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`, '_blank');

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      {/* Map */}
      <div ref={mapRef} className="flex-1 relative" />

      {/* Top Right Info */}
      <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg p-4 max-w-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Status</span>
          <span className="text-sm font-bold text-red-600">{liveStatus}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Responders Nearby</span>
          <span className="text-sm font-bold text-green-600">{responderCount}</span>
        </div>

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

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-200 p-6 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={handleCall}
            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" /> Call Victim
          </button>

          <button
            onClick={handleOpenMaps}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" /> Open Maps
          </button>
        </div>

        {alert.video_url && (
          <button
            onClick={() => window.open(alert.video_url, '_blank')}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            📹 View Live Video
          </button>
        )}

        <button
          onClick={() => handleStatusChange('complete')}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" /> Mark as Complete
        </button>
      </div>
    </div>
  );
}
