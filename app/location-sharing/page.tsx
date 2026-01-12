'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import ContactLocationMap from '@/components/ContactLocationMap';
import ContactLocationTracker from '@/components/ContactLocationTracker';
import LocationSharingSettings from '@/components/LocationSharingSettings';

export default function HybridLocationSharing() {
  const [sharingActive, setSharingActive] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const toggleSharing = () => {
    setSharingActive((prev) => !prev);
    if (!sharingActive) setSosActive(false);
  };

  const triggerSOS = () => {
    setSosActive(true);
    setSharingActive(true);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">

      {/* Run tracker ONLY when sharing */}
      {sharingActive && (
        <ContactLocationTracker
          onLocationUpdate={(lat, lng) => {
            console.log('Location:', lat, lng);
          }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Live Location Sharing</h1>
          <p className="text-zinc-400">
            Share your real-time location with trusted contacts
          </p>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl">
          <span
            className={`px-4 py-2 rounded-full font-semibold ${
              sosActive
                ? 'bg-red-600 text-white'
                : sharingActive
                ? 'bg-green-600 text-white'
                : 'bg-zinc-700 text-zinc-300'
            }`}
          >
            {sosActive
              ? 'SOS ACTIVE'
              : sharingActive
              ? 'Sharing Active'
              : 'Idle'}
          </span>

          <div className="flex gap-3">
            <button
              onClick={toggleSharing}
              className={`px-6 py-2 rounded-lg font-semibold ${
                sharingActive
                  ? 'bg-red-700 hover:bg-red-600'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {sharingActive ? 'Stop Sharing' : 'Start Sharing'}
            </button>

            <button
              onClick={triggerSOS}
              className="px-6 py-2 bg-red-800 hover:bg-red-700 rounded-lg font-bold"
            >
              Trigger SOS
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <LocationSharingSettings />
        </div>

        {/* Map */}
        <div className="bg-zinc-900 p-4 rounded-xl">
          <ContactLocationMap autoRefresh refreshInterval={10000} />
        </div>

      </div>
    </div>
  );
}
