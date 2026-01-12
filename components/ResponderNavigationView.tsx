'use client';

import { X, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LatLng } from './ResponderMap';

const ResponderMap = dynamic(() => import('@/components/ResponderMap'), {
  ssr: false,
});

interface Props {
  responder: LatLng;
  victim: LatLng;
  onClose: () => void;
}

export default function ResponderNavigationView({
  responder,
  victim,
  onClose,
}: Props) {
  // Distance (Haversine)
  const calculateDistanceKm = () => {
    const R = 6371;
    const dLat = ((victim.lat - responder.lat) * Math.PI) / 180;
    const dLng = ((victim.lng - responder.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((responder.lat * Math.PI) / 180) *
        Math.cos((victim.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const distanceKm = calculateDistanceKm();
  const etaMinutes = Math.max(1, Math.ceil(distanceKm * 2)); // ~30km/h assumption

  return (
    <div className="fixed inset-0 z-50 bg-gray-100">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">EMERGENCY NAVIGATION</p>
          <p className="text-sm font-bold text-gray-900">
            {distanceKm.toFixed(1)} km • ETA {etaMinutes} min
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Map */}
      <div className="absolute inset-0 pt-[64px] pb-[88px]">
        <ResponderMap
          responder={responder}
          victim={victim}
          mode="navigation"
          maxHeight="100%"
          onClose={onClose}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg px-4 py-3">
        <button
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition"
        >
          <Navigation className="w-5 h-5" />
          Continue Navigation
        </button>
      </div>
    </div>
  );
}
