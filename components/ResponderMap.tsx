import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../utils/supabaseClient';

const userIcon = L.icon({
  iconUrl: '/user-icon.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});
const responderIcon = L.icon({
  iconUrl: '/responder-icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function ResponderMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current, {
      center: [37.7749, -122.4194],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 10,
      maxZoom: 18,
    }).addTo(leafletMap.current);
    // User marker
    L.marker([37.7749, -122.4194], { icon: userIcon }).addTo(leafletMap.current);
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;
    // Subscribe to responders in real-time from Supabase
    let responderMarkers: L.Marker[] = [];
    const fetchResponders = async () => {
      const { data } = await supabase.from('responders').select('lat,lng');
      responderMarkers.forEach((m) => m.remove());
      responderMarkers = [];
      data?.forEach((r: { lat: number; lng: number }) => {
        const marker = L.marker([r.lat, r.lng], { icon: responderIcon }).addTo(leafletMap.current!);
        responderMarkers.push(marker);
      });
    };
    fetchResponders();
    const channel = supabase.channel('responders').on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, fetchResponders).subscribe();
    return () => {
      channel.unsubscribe();
      responderMarkers.forEach((m) => m.remove());
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full bg-zinc-900 rounded-lg" />;
} 