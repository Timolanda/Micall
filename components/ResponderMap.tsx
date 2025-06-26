"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function ResponderMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const responderMarkers = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (leafletMap.current && userMarker.current) {
          userMarker.current.setLatLng(coords);
          leafletMap.current.setView(coords, 14);
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current || typeof window === 'undefined') return;

    const initMap = async () => {
      const L = await import('leaflet');
      
      // Check if map is already initialized
      if (leafletMap.current) return;
      
      const userIcon = L.icon({
        iconUrl: '/user-icon.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      if (mapRef.current) {
        leafletMap.current = L.map(mapRef.current, {
          center: [0, 0],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          minZoom: 10,
          maxZoom: 18,
        }).addTo(leafletMap.current);
        
        userMarker.current = L.marker([0, 0], { icon: userIcon }).addTo(leafletMap.current);
        setIsMapLoaded(true);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        userMarker.current = null;
        responderMarkers.current = [];
        setIsMapLoaded(false);
      }
    };
  }, []);

  // Update user marker and fetch responders
  useEffect(() => {
    if (!userLocation || !leafletMap.current || !isMapLoaded) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      
      userMarker.current?.setLatLng(userLocation);
      leafletMap.current.setView(userLocation, 14);
      
      // Fetch responders within 1km
      const fetchResponders = async () => {
        const { data } = await supabase.rpc('get_nearby_responders', {
          lat: userLocation[0],
          lng: userLocation[1],
          radius_km: 1
        });
        
        responderMarkers.current.forEach((m) => m.remove());
        responderMarkers.current = [];
        
        data?.forEach((r: { lat: number; lng: number }) => {
          const marker = L.marker([r.lat, r.lng], { icon: L.icon({
            iconUrl: '/responder-icon.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }) }).addTo(leafletMap.current!);
          responderMarkers.current.push(marker);
        });
      };
      
      fetchResponders();
      
      // Subscribe to real-time updates
      const channel = supabase.channel('responders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, fetchResponders)
        .subscribe();
      
      return () => {
        channel.unsubscribe();
        responderMarkers.current.forEach((m) => m.remove());
      };
    };

    updateMap();
  }, [userLocation, isMapLoaded]);

  return <div ref={mapRef} className="w-full h-full bg-zinc-900 rounded-lg" />;
} 