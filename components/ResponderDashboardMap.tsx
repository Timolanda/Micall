'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Alert {
  id: string;
  lat: number;
  lng: number;
  type: string;
}

interface Props {
  alerts: Alert[];
  responderLat: number;
  responderLng: number;
  onAlertClick: (alert: Alert) => void;
}

export default function ResponderDashboardMap({
  alerts,
  responderLat,
  responderLng,
  onAlertClick,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  /* =========================
     INIT MAP (FIXED)
  ========================= */

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([responderLat || 0, responderLng || 0], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove(); // ✅ CORRECT CLEANUP
      mapRef.current = null;
    };
  }, [responderLat, responderLng]);

  /* =========================
     MARKERS
  ========================= */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layers
    map.eachLayer((layer) => {
      if ((layer as any)._icon) {
        map.removeLayer(layer);
      }
    });

    // Responder marker
    if (responderLat && responderLng) {
      L.marker([responderLat, responderLng], {
        icon: L.divIcon({
          className: 'responder-marker',
          html: '🧍',
          iconSize: [24, 24],
        }),
      }).addTo(map);
    }

    // Alert markers
    alerts.forEach((alert) => {
      const marker = L.marker([alert.lat, alert.lng], {
        icon: L.divIcon({
          className: 'alert-marker',
          html: '🚨',
          iconSize: [24, 24],
        }),
      });

      marker.on('click', () => onAlertClick(alert));
      marker.addTo(map);
    });
  }, [alerts, responderLat, responderLng, onAlertClick]);

  /* =========================
     AUTO FIT BOUNDS
  ========================= */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || alerts.length === 0) return;

    const bounds = L.latLngBounds([]);

    alerts.forEach((a) => bounds.extend([a.lat, a.lng]));

    if (responderLat && responderLng) {
      bounds.extend([responderLat, responderLng]);
    }

    map.fitBounds(bounds, { padding: [80, 80] });
  }, [alerts, responderLat, responderLng]);

  /* =========================
     UI
  ========================= */

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
