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
  const [mapError, setMapError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get user location
  useEffect(() => {
    if (!isClient) return;
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using fallback location');
      // Use a fallback location instead of showing error
      setUserLocation([40.7128, -74.0060]); // NYC as fallback
      return;
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        console.log('Location updated:', coords);
        setUserLocation(coords);
        if (leafletMap.current && userMarker.current) {
          userMarker.current.setLatLng(coords);
          leafletMap.current.setView(coords, 14);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        // Use fallback location instead of showing error
        console.log('Using fallback location due to geolocation error');
        setUserLocation([40.7128, -74.0060]); // NYC as fallback
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 30000 
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isClient]);

  // Initialize map
  useEffect(() => {
    if (!isClient || !mapRef.current || leafletMap.current) return;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        
        // Check if map is already initialized
        if (leafletMap.current) return;
        
        // Create custom icons using SVG-like approach
        const createUserIcon = () => {
          return L.divIcon({
            className: 'custom-user-marker',
            html: `
              <div style="
                width: 20px; 
                height: 20px; 
                background: #3b82f6; 
                border: 3px solid white; 
                border-radius: 50%; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                position: relative;
              ">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 6px;
                  height: 6px;
                  background: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
        };

        const createResponderIcon = () => {
          return L.divIcon({
            className: 'custom-responder-marker',
            html: `
              <div style="
                width: 16px; 
                height: 16px; 
                background: #ef4444; 
                border: 2px solid white; 
                border-radius: 50%; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
        };

        if (mapRef.current) {
          // Default to a fallback location if no user location yet
          const defaultLocation: [number, number] = userLocation || [40.7128, -74.0060]; // NYC as fallback
          
          leafletMap.current = L.map(mapRef.current, {
            center: defaultLocation,
            zoom: 14,
            zoomControl: true,
            attributionControl: false,
          });
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 10,
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
          }).addTo(leafletMap.current);
          
          // Add user marker
          userMarker.current = L.marker(defaultLocation, { 
            icon: createUserIcon(),
            title: 'Your Location'
          }).addTo(leafletMap.current);
          
          setIsMapLoaded(true);
        }
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError('Failed to load map');
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
  }, [isClient, userLocation]);

  // Update user marker and fetch responders
  useEffect(() => {
    if (!isClient || !userLocation || !leafletMap.current || !isMapLoaded) return;

    const updateMap = async () => {
      try {
        const L = await import('leaflet');
        
        // Update user marker position
        userMarker.current?.setLatLng(userLocation);
        leafletMap.current.setView(userLocation, 14);
        
        // Fetch responders within 1km
        const fetchResponders = async () => {
          try {
            const { data, error } = await supabase.rpc('get_nearby_responders', {
              lat: userLocation[0],
              lng: userLocation[1],
              radius_km: 1
            });
            
            if (error) {
              console.error('Error fetching responders:', error);
              return;
            }
            
            // Clear existing responder markers
            responderMarkers.current.forEach((m) => m.remove());
            responderMarkers.current = [];
            
            // Add new responder markers
            data?.forEach((r: { lat: number; lng: number; id: string }) => {
              const responderIcon = L.divIcon({
                className: 'custom-responder-marker',
                html: `
                  <div style="
                    width: 16px; 
                    height: 16px; 
                    background: #ef4444; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  "></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });
              
              const marker = L.marker([r.lat, r.lng], { 
                icon: responderIcon,
                title: 'Emergency Responder'
              }).addTo(leafletMap.current!);
              
              responderMarkers.current.push(marker);
            });
          } catch (error) {
            console.error('Error updating responders:', error);
          }
        };
        
        fetchResponders();
        
        // Set up real-time updates
        const channel = supabase.channel('responders-map')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, fetchResponders)
          .subscribe();
        
        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Map update error:', error);
      }
    };

    updateMap();
  }, [isClient, userLocation, isMapLoaded]);

  // Don't render anything until we're on the client
  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-sm text-gray-400">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-xl"
      style={{ minHeight: '256px' }}
    />
  );
} 