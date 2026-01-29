'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';
import ContactLocationTracker from '@/components/ContactLocationTracker';
import LocationSharingSettings from '@/components/LocationSharingSettings';
import EmergencyContactModal from '@/components/EmergencyContactModal';

// Dynamically import map component to prevent SSR issues
const ContactLocationMap = dynamic(() => import('@/components/ContactLocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-200 rounded-lg animate-pulse" />,
});

interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

export default function HybridLocationSharing() {
  const [sharingActive, setSharingActive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sharingDuration, setSharingDuration] = useState<number>(0);
  const [showContactModal, setShowContactModal] = useState(false);

  // Timer for SOS and sharing duration
  useEffect(() => {
    if (!sharingActive) return;

    const interval = setInterval(() => {
      setSharingDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [sharingActive]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const toggleSharing = () => {
    setSharingActive((prev) => !prev);
    if (!sharingActive) {
      setSosActive(false);
      setSharingDuration(0);
      setLocationError(null);
      // Request location permission
      requestLocationPermission();
    }
  };

  const requestLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
            accuracy,
          });
          setLocationError(null);
        },
        (error) => {
          let errorMsg = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please enable in settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }
          setLocationError(errorMsg);
        }
      );
    } catch (error) {
      setLocationError('Failed to request location');
    }
  };

  const triggerSOS = async () => {
    setSosActive(true);
    setSharingActive(true);
    setSharingDuration(0);
    await requestLocationPermission();
  };

  const stopSOS = () => {
    setSosActive(false);
    // Keep sharing until manually stopped
  };

  const stopSharing = () => {
    setSharingActive(false);
    setSosActive(false);
    setSharingDuration(0);
    setCurrentLocation(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-4 py-6">

      {/* Location Tracker - Background Service */}
      {sharingActive && (
        <ContactLocationTracker
          onLocationUpdate={(lat, lng) => {
            setCurrentLocation({
              lat,
              lng,
              timestamp: Date.now(),
            });
          }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ================= HOW IT WORKS & SAFETY TIPS CARD ================= */}
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 border border-blue-500/50 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-blue-200 mb-3">💡 How Location Sharing Works</h2>
            <ul className="space-y-2 text-sm text-blue-100">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Your location updates every 5 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Only your emergency contacts can see it</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Works 24/7 without creating an alert</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Useful if you lose your phone or need help</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-blue-400/30 pt-4">
            <h3 className="text-lg font-bold text-blue-200 mb-3">🛡️ Safety Tips</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Enable location sharing when traveling alone or in unsafe areas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Keep your trusted contacts updated and verified</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Use SOS only in genuine emergencies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Review location sharing settings regularly</span>
              </li>
            </ul>
          </div>
        </div>
        <div
          className={`rounded-2xl p-6 border-2 shadow-lg transition-all duration-300 ${
            sosActive
              ? 'bg-red-900/40 border-red-500 animate-pulse'
              : sharingActive
              ? 'bg-blue-900/30 border-blue-500'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {sosActive ? (
                  <>
                    <span className="text-red-500 animate-pulse">🚨</span>
                    SOS MODE ACTIVE
                  </>
                ) : sharingActive ? (
                  <>
                    <span className="text-blue-400">📍</span>
                    Live Location Sharing
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">⚪</span>
                    Location Idle
                  </>
                )}
              </h1>

              <p className="text-sm mt-2 text-gray-300">
                {sosActive
                  ? 'Emergency mode: Your location is being broadcast urgently to all trusted contacts.'
                  : sharingActive
                  ? 'Your trusted contacts can see your live location and movement.'
                  : 'Enable location sharing when you feel unsafe or need assistance.'}
              </p>

              {sharingActive && (
                <p className="text-xs mt-2 text-gray-400">
                  Sharing for: <span className="font-mono font-bold text-blue-400">{formatDuration(sharingDuration)}</span>
                  {currentLocation && (
                    <span className="ml-4">
                      Accuracy: <span className="font-mono text-blue-400">{Math.round(currentLocation.accuracy || 0)}m</span>
                    </span>
                  )}
                </p>
              )}

              {locationError && (
                <p className="text-xs mt-2 text-red-400">⚠️ {locationError}</p>
              )}
            </div>

            {sosActive && (
              <button
                onClick={stopSOS}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-bold transition"
              >
                Deactivate SOS
              </button>
            )}
          </div>
        </div>

        {/* ================= MAIN TOGGLE SECTION ================= */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Location Sharing</h2>
            <p className="text-sm text-gray-400">
              Share your real-time location with trusted contacts
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleSharing}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                sharingActive
                  ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30'
              }`}
            >
              {sharingActive ? '🛑 Stop Sharing' : '▶️ Start Sharing'}
            </button>

            {sharingActive && (
              <button
                onClick={stopSharing}
                className="px-4 rounded-xl border border-gray-600 hover:bg-gray-700 transition font-medium"
              >
                End Session
              </button>
            )}
          </div>
        </div>

        {/* ================= EMERGENCY SOS ZONE ================= */}
        <div className="bg-gradient-to-br from-red-950/60 to-red-900/30 border-2 border-red-700/70 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-red-400 mb-1">🚨 Emergency SOS</h2>
            <p className="text-sm text-gray-300">
              Use only in immediate danger. This forces urgent location broadcasting to all trusted contacts.
            </p>
          </div>

          <button
            onClick={triggerSOS}
            disabled={sosActive}
            className={`w-full py-4 px-6 rounded-xl font-extrabold text-lg tracking-wide transition-all ${
              sosActive
                ? 'bg-red-600/50 cursor-not-allowed opacity-75'
                : 'bg-red-700 hover:bg-red-600 shadow-lg shadow-red-700/50 active:scale-95'
            }`}
          >
            {sosActive ? '🚨 SOS ACTIVE' : '🆘 TRIGGER SOS'}
          </button>
        </div>

        {/* ================= LIVE MAP ================= */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50">
            <h3 className="font-bold text-lg flex items-center gap-2">
              📍 Live Location Map
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {sharingActive
                ? currentLocation
                  ? `Last updated: ${new Date(currentLocation.timestamp).toLocaleTimeString()}`
                  : 'Acquiring location...'
                : 'Not sharing'}
            </p>
          </div>

          <div className={`h-96 relative overflow-hidden transition-opacity ${!sharingActive && 'opacity-50'}`}>
            {sharingActive ? (
              <ContactLocationMap />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900/50 text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Map inactive</p>
                  <p className="text-sm">Start sharing to see your live location</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= LOCATION DETAILS ================= */}
        {currentLocation && sharingActive && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-gray-300">Current Location Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Latitude</p>
                <p className="font-mono text-blue-400 font-bold">{currentLocation.lat.toFixed(6)}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Longitude</p>
                <p className="font-mono text-blue-400 font-bold">{currentLocation.lng.toFixed(6)}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Accuracy</p>
                <p className="font-mono text-blue-400 font-bold">±{Math.round(currentLocation.accuracy || 0)}m</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Last Update</p>
                <p className="font-mono text-blue-400 font-bold text-xs">
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= SETTINGS ================= */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            ⚙️ Sharing Settings
          </h3>
          <LocationSharingSettings onOpenContactModal={() => setShowContactModal(true)} />
        </div>

        {/* ================= EMERGENCY CONTACT MODAL ================= */}
        <EmergencyContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />

      </div>
    </div>
  );
}
