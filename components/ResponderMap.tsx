"use client";

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

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
  const alertMarkers = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const leafletRef = useRef<any>(null);
  const lastLocationUpdate = useRef<number>(0);
  const responderMarkers = useRef<any[]>([]);

  // Create responder icon with status-based colors
  const createResponderIcon = (status?: string) => {
    if (!leafletRef.current) return null;
    const L = leafletRef.current;

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

  // Get user location with throttling (5 seconds minimum between updates)
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using fallback location');
      setUserLocation([40.7128, -74.0060]);
      return;
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocationUpdate.current >= 5000) {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          lastLocationUpdate.current = now;
          setUserLocation(coords);
          if (leafletMap.current && userMarker.current) {
            userMarker.current.setLatLng(coords);
            leafletMap.current.setView(coords, 14);
          }
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setUserLocation([40.7128, -74.0060]);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 5000
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        leafletRef.current = L;
        
        if (leafletMap.current) return;
        
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
          const defaultLocation: [number, number] = userLocation || [40.7128, -74.0060];
          
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

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        userMarker.current = null;
        responderMarkers.current = [];
        setIsMapLoaded(false);
      }
    };
  }, [userLocation]);

  // Update user marker and render alert markers
  useEffect(() => {
    if (!userLocation || !leafletMap.current || !isMapLoaded) return;

    const updateMap = async () => {
      try {
        const L = await import('leaflet');
        
        userMarker.current?.setLatLng(userLocation);
        leafletMap.current.setView(userLocation, 14);
        
        if (alerts && alerts.length > 0) {
          alertMarkers.current.forEach((m) => m.remove());
          alertMarkers.current = [];
          
          alerts.forEach((alert: Alert) => {
            const alertIcon = createAlertIcon(alert.type);
            const marker = L.marker([alert.lat, alert.lng], { 
              icon: alertIcon,
              title: `${alert.type} - ${alert.message}`
            }).addTo(leafletMap.current!);
            
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
      } catch (error) {
        console.error('Error updating map:', error);
      }
    };

    updateMap();
  }, [userLocation, alerts, onAlertClick]);

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
