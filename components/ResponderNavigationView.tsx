'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Navigation, MapPin, Clock, CheckCircle2, X, AlertCircle } from 'lucide-react';
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
}

export default function ResponderNavigationView({
  alert,
  responderLat,
  responderLng,
  onClose,
  onStatusChange,
}: ResponderNavProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [status, setStatus] = useState<'en_route' | 'on_scene' | 'complete'>('en_route');
  const [navInfo, setNavInfo] = useState(
    getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng)
  );
  const [isClient, setIsClient] = useState(false);
  const [respondersCount, setRespondersCount] = useState(1);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'live' | 'completed'>('live');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Monitor network reconnects
  useEffect(() => {
    const handleOffline = () => {
      setIsReconnecting(true);
      toast.error('Connection lost. Reconnecting...');
    };
    const handleOnline = () => {
      setIsReconnecting(false);
      toast.success('Reconnected!');
      initializeMap(); // re-attach map and markers
      fetchRespondersCount(); // refresh responder count
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  /** ---------------- UTILS ---------------- */
  const createIcons = (L: any) => {
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
  };

  /** ---------------- FETCH RESPONDER COUNT ---------------- */
  const fetchRespondersCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('responder_presence')
        .select('id')
        .eq('alert_id', alert.id)
        .eq('active', true);

      if (!error) setRespondersCount(data?.length || 1);
    } catch (error) {
      console.error('Failed to fetch responders count', error);
    }
  }, [alert.id]);

  /** ---------------- INITIALIZE MAP ---------------- */
  const initializeMap = useCallback(async () => {
    if (!isClient || !mapRef.current) return;

    const L = await import('leaflet');
    leafletRef.current = L;
    const { victimIcon, responderIcon } = createIcons(L);

    const responderCoords = L.latLng(responderLat, responderLng);

    if (!mapInstanceRef.current) {
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
    }

    // Add or refresh victim marker
    const victimMarker = L.marker(L.latLng(alert.lat, alert.lng), { icon: victimIcon }).addTo(mapInstanceRef.current);
    victimMarker.bindPopup(
      `<div class="text-sm"><p class="font-bold">Emergency Location</p><p class="text-red-600">${alert.message}</p></div>`
    );

    // Add or refresh responder marker
    const responderMarker = L.marker(responderCoords, { icon: responderIcon }).addTo(mapInstanceRef.current);
    responderMarker.bindPopup('<div class="text-sm"><p class="font-bold">Your Location</p></div>');

    mapInstanceRef.current.setView(responderCoords, 15);
  }, [isClient, alert.lat, alert.lng, alert.message, responderLat, responderLng]);

  /** ---------------- EFFECTS ---------------- */
  useEffect(() => {
    initializeMap();
    fetchRespondersCount();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initializeMap, fetchRespondersCount]);

  useEffect(() => {
    const newNavInfo = getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng);
    setNavInfo(newNavInfo);

    if (mapInstanceRef.current && leafletRef.current) {
      const responderCoords = leafletRef.current.latLng(responderLat, responderLng);
      mapInstanceRef.current.setView(responderCoords, 15);
    }
  }, [responderLat, responderLng, alert.lat, alert.lng]);

  /** ---------------- STATUS HANDLERS ---------------- */
  const handleStatusChange = useCallback(
    async (newStatus: 'en_route' | 'on_scene' | 'complete') => {
      try {
        setStatus(newStatus);
        if (newStatus === 'complete') setLiveStatus('completed');
        onStatusChange?.(newStatus);
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      } catch (error) {
        toast.error('Failed to update status');
        console.error(error);
      }
    },
    [onStatusChange]
  );

  const handleCall = () => (window.location.href = 'tel:911');
  const handleOpenInMaps = () =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`, '_blank');

  /** ---------------- RENDER ---------------- */
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 flex gap-3 items-center z-50">
        <button
          onClick={onClose}
          className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Live Status */}
        <div className="bg-red-600 text-white rounded-full px-3 py-1 text-sm font-semibold">
          {liveStatus === 'live' ? '🔴 LIVE' : liveStatus === 'completed' ? '✅ Completed' : '⏳ Responding'}
        </div>

        {/* Responder Count */}
        <div className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-semibold">
          {respondersCount} responder{respondersCount > 1 ? 's' : ''}
        </div>

        {/* Reconnect Indicator */}
        {isReconnecting && (
          <div className="bg-yellow-400 text-black rounded-full px-3 py-1 text-sm font-semibold">
            Reconnecting...
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 relative" />

      {/* Top Right Info Card */}
      <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg p-4 max-w-xs space-y-3">
        {/* Distance / ETA / Direction */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-semibold text-gray-600">
            <span>Distance</span>
            <span className="text-lg font-bold text-blue-600">{navInfo.distanceKm.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-600">
            <span>ETA</span>
            <span className="text-lg font-bold text-green-600">{navInfo.etaTime}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-600">
            <span>Direction</span>
            <span className="text-lg font-bold text-purple-600">{navInfo.direction}</span>
          </div>
        </div>

        {/* Status Buttons */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Status</p>
          <div className="flex gap-2 flex-wrap">
            {(['en_route', 'on_scene', 'complete'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <button
            onClick={handleCall}
            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
          >
            <Phone className="w-5 h-5" /> Call Victim
          </button>

          <button
            onClick={handleOpenInMaps}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
          >
            <Navigation className="w-5 h-5" /> Open Maps
          </button>
        </div>

        {alert.video_url && (
          <button
            onClick={() => window.open(alert.video_url, '_blank')}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
          >
            📹 View Live Video
          </button>
        )}

        <button
          onClick={() => handleStatusChange('complete')}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
        >
          <CheckCircle2 className="w-5 h-5" /> Mark as Complete
        </button>
      </div>
    </div>
  );
}
