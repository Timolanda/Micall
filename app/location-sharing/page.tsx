'use client';

/**
 * Location Sharing Feature Integration Example
 * Shows how to use all location sharing components together
 */

import { useState } from 'react';
import LocationSharingSettings from '@/components/LocationSharingSettings';
import ContactLocationMap from '@/components/ContactLocationMap';
import ContactLocationTracker from '@/components/ContactLocationTracker';

export default function LocationSharingPage() {
  const [contactsUpdated, setContactsUpdated] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Background tracker - runs silently */}
      <ContactLocationTracker onLocationUpdate={(lat, lng) => {
        // Update tracking every 5 seconds
      }} />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Location Sharing</h1>
          <p className="text-lg opacity-90">
            Share your location with emergency contacts for added peace of mind
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings Panel */}
          <div className="lg:col-span-2">
            <LocationSharingSettings onContactsChange={() => setContactsUpdated(c => c + 1)} />
          </div>

          {/* Quick Info Sidebar */}
          <div className="space-y-4">
            {/* How It Works */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="font-bold text-lg text-gray-900">How It Works</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <span>Enable location sharing in settings</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span>Add up to 5 emergency contacts</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <span>Grant location access to each contact</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <span>Your location updates every 5 seconds</span>
                </li>
              </ol>
            </div>

            {/* Privacy Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="font-bold text-lg text-gray-900">🔒 Privacy</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Only emergency contacts can see your location</li>
                <li>✅ Disable anytime in settings</li>
                <li>✅ No data shared with responders unless in emergency</li>
                <li>✅ Encrypted transmission over HTTPS</li>
              </ul>
            </div>

            {/* Use Cases */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="font-bold text-lg text-gray-900">💡 Use Cases</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📍 Lost phone tracking</li>
                <li>👨‍👩‍👧‍👦 Family location sharing</li>
                <li>🚗 Travel safety</li>
                <li>👶 Caregiver monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tracked Locations Map */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Locations</h2>
          <ContactLocationMap autoRefresh={true} refreshInterval={10000} />
        </div>

        {/* Feature Comparison */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Location Sharing Modes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emergency Alert Mode */}
            <div className="border-2 border-red-200 rounded-xl p-6 space-y-3 bg-red-50">
              <h3 className="font-bold text-lg text-red-900">🚨 Emergency Alert</h3>
              <p className="text-sm text-red-800">
                When you create an SOS alert, responders can see your location in real-time
              </p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>✓ Real-time location during alert</li>
                <li>✓ Only active responders can see</li>
                <li>✓ Automatically stops when alert resolves</li>
                <li>✓ No need to enable settings</li>
              </ul>
            </div>

            {/* Continuous Sharing Mode */}
            <div className="border-2 border-blue-200 rounded-xl p-6 space-y-3 bg-blue-50">
              <h3 className="font-bold text-lg text-blue-900">📍 Continuous Sharing</h3>
              <p className="text-sm text-blue-800">
                Your emergency contacts can see your location 24/7 without an alert
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Constant location updates (5s)</li>
                <li>✓ Only trusted emergency contacts</li>
                <li>✓ Disable anytime in settings</li>
                <li>✓ Perfect for safety & lost phone tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="border border-gray-200 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-gray-900 flex items-center justify-between">
                Will my location drain my battery?
                <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-gray-600 mt-3 text-sm">
                No, our location tracking is optimized for battery efficiency. Updates occur
                every 5 seconds only when location sharing is enabled, and we use device-level
                location APIs that are designed for low power consumption.
              </p>
            </details>

            <details className="border border-gray-200 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-gray-900 flex items-center justify-between">
                Can I disable location sharing anytime?
                <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-gray-600 mt-3 text-sm">
                Yes! You can disable location sharing at any time from the settings. When you
                turn it off, your emergency contacts will no longer see your location.
              </p>
            </details>

            <details className="border border-gray-200 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-gray-900 flex items-center justify-between">
                What if I lose my phone?
                <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-gray-600 mt-3 text-sm">
                Your emergency contacts can track your phone&apos;s last known location as long as
                location sharing is enabled. This helps you locate your phone quickly.
              </p>
            </details>

            <details className="border border-gray-200 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-gray-900 flex items-center justify-between">
                Is my location data secure?
                <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-gray-600 mt-3 text-sm">
                Yes. All location data is encrypted in transit (HTTPS) and at rest in our
                database. Only you and your authorized emergency contacts can access it.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
