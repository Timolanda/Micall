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
    <div className="min-h-screen bg-black text-white px-4 py-6">

      {/* Run tracker ONLY when sharing */}
      {sharingActive && (
        <ContactLocationTracker
          onLocationUpdate={(lat, lng) => {
            console.log('Location:', lat, lng);
          }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ================= STATUS CARD ================= */}
        <div
          className={`rounded-2xl p-6 border transition ${
            sosActive
              ? 'bg-red-900/40 border-red-600'
              : sharingActive
              ? 'bg-green-900/30 border-green-600'
              : 'bg-zinc-900 border-zinc-700'
          }`}
        >
          <h1 className="text-2xl font-bold">
            {sosActive
              ? '🚨 SOS MODE ACTIVE'
              : sharingActive
              ? '📍 Live Location Sharing'
              : 'Location Sharing Idle'}
          </h1>

          <p className="text-sm mt-1 text-zinc-300">
            {sosActive
              ? 'Your location is being broadcast urgently to trusted contacts.'
              : sharingActive
              ? 'Your trusted contacts can see your live location.'
              : 'Start sharing your location when you feel unsafe.'}
          </p>
        </div>

        {/* ================= PRIMARY ACTION ================= */}
        <div className="bg-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">
              Live Location
            </h2>
            <p className="text-sm text-zinc-400">
              Turn on to share your movement in real time
            </p>
          </div>

          <button
            onClick={toggleSharing}
            className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition ${
              sharingActive
                ? 'bg-red-700 hover:bg-red-600'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {sharingActive ? 'Stop Sharing' : 'Start Sharing'}
          </button>
        </div>

        {/* ================= SOS ZONE ================= */}
        <div className="bg-red-950/60 border border-red-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-400 mb-2">
            Emergency SOS
          </h2>

          <p className="text-sm text-zinc-300 mb-4">
            Use only if you are in immediate danger. This will force location sharing.
          </p>

          <button
            onClick={triggerSOS}
            className="w-full py-4 bg-red-700 hover:bg-red-600 rounded-xl font-extrabold text-lg tracking-wide"
          >
            🚨 TRIGGER SOS
          </button>
        </div>

        {/* ================= LIVE MAP ================= */}
        <div className="bg-zinc-900 rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Live Map</h3>

          <div className="h-[320px] rounded-xl overflow-hidden">
            <ContactLocationMap autoRefresh refreshInterval={10000} />
          </div>
        </div>

        {/* ================= SETTINGS ================= */}
        <div className="bg-zinc-900 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Sharing Settings</h3>
          <LocationSharingSettings />
        </div>

      </div>
    </div>
  );
}
