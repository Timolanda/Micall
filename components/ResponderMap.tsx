'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* =======================
   TYPES
======================= */
export interface LatLng {
  lat: number;
  lng: number;
}

type MapMode = 'preview' | 'live' | 'navigation';

interface Props {
  responder?: LatLng;
  victim?: LatLng;
  otherResponders?: LatLng[];
  mode?: MapMode;
  onClose?: () => void;
  maxHeight?: string;
}

/* =======================
   CONSTANTS
======================= */
const BOTTOM_NAV_HEIGHT = 64; // MUST match BottomNav

/* =======================
   FIX LEAFLET ICONS
======================= */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* =======================
   ICON CREATOR
======================= */
const createIcon = (emoji: string) =>
  L.divIcon({
    className: 'text-xl',
    html: emoji,
    iconSize: [32, 32],
  });

/* =======================
   MAP ENGINE
======================= */
export default function ResponderMap({
  responder,
  victim,
  otherResponders = [],
  mode = 'preview',
  onClose,
  maxHeight = '100%',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const responderMarkerRef = useRef<L.Marker | null>(null);
  const victimMarkerRef = useRef<L.Marker | null>(null);
  const otherMarkersRef = useRef<L.Marker[]>([]);
  const routeRef = useRef<L.Polyline | null>(null);

  const [distanceText, setDistanceText] = useState<string | null>(null);

  /* ---------------- CREATE MAP ---------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: mode !== 'preview',
      attributionControl: false,
    }).setView([-1.286389, 36.817223], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // 🔒 Force Leaflet BELOW navbar
    const panes = containerRef.current.querySelectorAll(
      '.leaflet-pane, .leaflet-top, .leaflet-bottom'
    );
    panes.forEach((pane) => {
      (pane as HTMLElement).style.zIndex = '10';
    });

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mode]);

  /* ---------------- UPDATE MARKERS ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    responderMarkerRef.current?.remove();
    victimMarkerRef.current?.remove();
    routeRef.current?.remove();
    otherMarkersRef.current.forEach((m) => m.remove());
    otherMarkersRef.current = [];
    setDistanceText(null);

    let bounds: L.LatLngBounds | null = null;

    if (responder) {
      const m = L.marker(
        [responder.lat, responder.lng],
        { icon: createIcon('🧍‍♂️') }
      ).addTo(map);
      responderMarkerRef.current = m;
      bounds = L.latLngBounds([m.getLatLng()]);
    }

    if (mode === 'live') {
      otherResponders.forEach((r) => {
        const m = L.marker(
          [r.lat, r.lng],
          { icon: createIcon('👥') }
        ).addTo(map);
        otherMarkersRef.current.push(m);
        bounds = bounds ? bounds.extend(m.getLatLng()) : L.latLngBounds([m.getLatLng()]);
      });
    }

    if (victim) {
      const m = L.marker(
        [victim.lat, victim.lng],
        { icon: createIcon('🚨') }
      ).addTo(map);
      victimMarkerRef.current = m;
      bounds = bounds ? bounds.extend(m.getLatLng()) : L.latLngBounds([m.getLatLng()]);
    }

    if (responder && victim) {
      const line = L.polyline(
        [
          [responder.lat, responder.lng],
          [victim.lat, victim.lng],
        ],
        {
          color: mode === 'navigation' ? '#2563eb' : '#ef4444',
          weight: mode === 'navigation' ? 5 : 3,
          dashArray: mode === 'preview' ? '6 6' : undefined,
        }
      ).addTo(map);

      routeRef.current = line;

      const R = 6371;
      const dLat = ((victim.lat - responder.lat) * Math.PI) / 180;
      const dLng = ((victim.lng - responder.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(responder.lat * Math.PI / 180) *
          Math.cos(victim.lat * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;

      const distanceKm = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const etaMin = Math.max(1, Math.round((distanceKm / 40) * 60));

      setDistanceText(`Distance ${distanceKm.toFixed(1)} km · ETA ${etaMin} min`);
    }

    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        animate: false,
      });
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [responder, victim, otherResponders, mode]);

  /* ---------------- UI ---------------- */
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: maxHeight,
        paddingBottom: `${BOTTOM_NAV_HEIGHT}px`,
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 bg-black/70 text-white px-3 py-1 rounded-lg"
        >
          ✕
        </button>
      )}

      <div ref={containerRef} className="w-full h-full rounded-lg" />

      {distanceText && mode !== 'preview' && (
        <div className="absolute bottom-4 left-4 z-20 bg-black/70 text-white text-sm px-3 py-1 rounded-lg">
          {distanceText}
        </div>
      )}
    </div>
  );
}
