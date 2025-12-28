"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface Alert {
  id: number;
  lat: number;
  lng: number;
  type: string;
  message: string;
  created_at: string;
  status: string;
  user_id: string;
}

interface ResponderMapProps {
  alerts?: Alert[];
  onAlertClick?: (alert: Alert) => void;
  responderLat?: number;
  responderLng?: number;
}

export default function ResponderMap({ alerts = [], onAlertClick, responderLat, responderLng }: ResponderMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    responderLat && responderLng ? [responderLat, responderLng] : null
  );
  const responderMarkers = useRef<any[]>([]);
  const alertMarkers = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const leafletRef = useRef<any>(null);

  // Create responder icon with status-based colors
  const createResponderIcon = (status?: string) => {
    if (!leafletRef.current) return null;
    const L = leafletRef.current;

    // Status-based colors
    const statusColors: Record<string, string> = {
      'available': '#10b981',      // Green
      'en-route': '#3b82f6',       // Blue
      'on-scene': '#f59e0b',       // Amber
      'complete': '#8b5cf6',       // Purple
    };

    const color = statusColors[status || 'available'] || '#ef4444'; // Default red
    
    return L.divIcon({
      className: 'custom-responder-marker',
      html: `
        <div style="
          width: 20px; 
          height: 20px; 
          background: ${color}; 
          border: 2px solid white; 
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

  // Create alert icon with type-based colors
  const createAlertIcon = (type?: string) => {
    if (!leafletRef.current) return null;
    const L = leafletRef.current;

    const typeColors: Record<string, string> = {
      'SOS': '#ef4444',        // Red
      'Go Live': '#f97316',    // Orange
      'video': '#3b82f6',      // Blue
      'Health': '#ec4899',     // Pink
      'Fire': '#dc2626',       // Dark Red
      'Assault': '#7c3aed',    // Violet
      'Accident': '#f59e0b',   // Amber
    };

    const color = typeColors[type || 'SOS'] || '#ef4444';
    
    return L.divIcon({
      className: 'custom-alert-marker',
      html: `
        <div style="
          width: 28px; 
          height: 28px; 
          background: ${color}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 0 10px ${color}80;
          position: relative;
          animation: pulse 2s infinite;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          </style>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

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
        leafletRef.current = L; // Store reference for createResponderIcon
        
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
        
        // Add alert markers from props
        if (alerts && alerts.length > 0) {
          // Clear existing alert markers
          alertMarkers.current.forEach((m) => m.remove());
          alertMarkers.current = [];
          
          // Add new alert markers
          alerts.forEach((alert: Alert) => {
            const alertIcon = createAlertIcon(alert.type);
            const marker = L.marker([alert.lat, alert.lng], { 
              icon: alertIcon,
              title: `${alert.type} - ${alert.message}`
            }).addTo(leafletMap.current!);
            
            // Add popup with alert details
            marker.bindPopup(`
              <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
                <strong style="color: #ef4444;">${alert.type}</strong><br/>
                <span style="color: #666;">${alert.message}</span><br/>
                <span style="font-size: 11px; color: #999;">Created: ${new Date(alert.created_at).toLocaleTimeString()}</span><br/>
                <button style="
                  margin-top: 8px;
                  padding: 4px 8px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-weight: bold;
                  width: 100%;
                " onclick="alert('Navigate to this incident')">
                  Navigate
                </button>
              </div>
            `, { 
              maxWidth: 200,
              className: 'alert-popup'
            });
            
            marker.on('click', () => {
              if (onAlertClick) {
                onAlertClick(alert);
              }
            });
            
            alertMarkers.current.push(marker);
          });
        }
        
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
            data?.forEach((r: { lat: number; lng: number; id: string; status?: string }) => {
              const responderIcon = createResponderIcon(r.status);
              
              const statusLabel = r.status 
                ? r.status.charAt(0).toUpperCase() + r.status.slice(1).replace('-', ' ')
                : 'Available';
              
              const marker = L.marker([r.lat, r.lng], { 
                icon: responderIcon,
                title: `Emergency Responder - ${statusLabel}`
              }).addTo(leafletMap.current!);
              
              // Add popup with responder status
              marker.bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px;">
                  <strong>Responder Status</strong><br/>
                  Status: <span style="color: green; font-weight: bold;">${statusLabel}</span>
                </div>
              `, { 
                maxWidth: 150,
                className: 'responder-popup'
              });
              
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
  }, [isClient, userLocation, isMapLoaded, alerts]);

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