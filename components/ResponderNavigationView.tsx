'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Navigation, CheckCircle2, X, Video } from 'lucide-react';
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
  const [navInfo, setNavInfo] = useState(getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng));
  const [showVideo, setShowVideo] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** ---------------- CLIENT CHECK ---------------- */
  useEffect(() => { setIsClient(true); }, []);

  /** ---------------- ALERT SOUND ---------------- */
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alert-sound.mp3'); // place sound in /public
    }
    audioRef.current.play().catch(() => console.warn('Audio blocked by browser'));
  }, [alert.id]); // plays on every new alert

  /** ---------------- MAP ---------------- */
  const createIcons = useCallback((L: any) => {
    const victimIcon = new L.Icon({
      iconUrl: 'data:image/svg+xml,<svg fill="%23dc2626" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="%23fff"/></svg>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    const responderIcon = new L.Icon({
      iconUrl: 'data:image/svg+xml,<svg fill="%2322c55e" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    return { victimIcon, responderIcon };
  }, []);

  const initializeMap = useCallback(async () => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;
    try {
      const L = await import('leaflet');
      leafletRef.current = L;
      const { victimIcon, responderIcon } = createIcons(L);
      const responderCoords = L.latLng(responderLat, responderLng);
      mapInstanceRef.current = L.map(mapRef.current, { center: responderCoords, zoom: 15, zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstanceRef.current);

      L.marker(L.latLng(alert.lat, alert.lng), { icon: victimIcon }).addTo(mapInstanceRef.current).bindPopup(alert.message);
      L.marker(responderCoords, { icon: responderIcon }).addTo(mapInstanceRef.current).bindPopup('Your Location');
    } catch (err) { console.error('Map init failed', err); }
  }, [isClient, alert.lat, alert.lng, alert.message, responderLat, responderLng, createIcons]);

  useEffect(() => {
    initializeMap();
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, [initializeMap]);

  /** ---------------- NAV INFO ---------------- */
  useEffect(() => {
    setNavInfo(getNavigationInfo(responderLat, responderLng, alert.lat, alert.lng));
    if (mapInstanceRef.current && leafletRef.current) {
      mapInstanceRef.current.setView(leafletRef.current.latLng(responderLat, responderLng), 15);
    }
  }, [responderLat, responderLng, alert.lat, alert.lng]);

  /** ---------------- STATUS ---------------- */
  const handleStatusChange = useCallback((newStatus: 'en_route' | 'on_scene' | 'complete') => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
  }, [onStatusChange]);

  /** ---------------- ACTIONS ---------------- */
  const handleCall = () => window.location.href = 'tel:911';
  const handleMaps = () => window.open(`https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`, '_blank');

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 left-4 z-50 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50">
        <X className="w-5 h-5 text-gray-700"/>
      </button>

      {/* Map */}
      <div ref={mapRef} className="flex-1 relative"/>

      {/* Info Card */}
      <div className="absolute top-6 right-4 bg-white shadow-xl rounded-2xl p-4 w-72 space-y-2 text-xs md:text-sm">
        <div className="flex justify-between"><span>Status</span><span className="font-bold text-red-600">{liveStatus}</span></div>
        <div className="flex justify-between"><span>Responders</span><span className="font-bold text-green-600">{responderCount}</span></div>
        <div className="flex justify-between"><span>Distance</span><span className="font-bold text-blue-600">{navInfo.distanceKm.toFixed(1)} km</span></div>
        <div className="flex justify-between"><span>ETA</span><span className="font-bold text-green-600">{navInfo.etaTime}</span></div>
        <div className="flex justify-between"><span>Direction</span><span className="font-bold text-purple-600">{navInfo.direction}</span></div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t p-4 space-y-2 md:space-y-3 flex flex-col md:flex-row md:gap-3">
        <button onClick={handleCall} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Phone className="w-5 h-5"/> Call Victim
        </button>
        <button onClick={handleMaps} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Navigation className="w-5 h-5"/> Open Maps
        </button>
        {alert.video_url && <button onClick={() => setShowVideo(true)} className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Video className="w-5 h-5"/> View Live Video
        </button>}
        <button onClick={() => handleStatusChange('complete')} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5"/> Complete
        </button>
      </div>

      {/* Video Modal */}
      {showVideo && alert.video_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-black rounded-xl overflow-hidden w-full max-w-md">
            <video src={alert.video_url} controls autoPlay className="w-full h-auto"/>
            <button onClick={() => setShowVideo(false)} className="absolute top-2 right-2 text-white text-xl font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
