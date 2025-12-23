'use client';

import { useState, useMemo } from 'react';
import AlertFilterSystem, { AlertFilters } from '@/components/AlertFilterSystem';
import ResponderAlertCard from '@/components/ResponderAlertCard';
import ResponseTimer from '@/components/ResponseTimer';
import ResponderNavigationView from '@/components/ResponderNavigationView';
import ResponderLocationTracker from '@/components/ResponderLocationTracker';
import { getNavigationInfo } from '@/utils/navigationUtils';

/**
 * Example integration of all navigation and response features
 * This shows how to combine all components for a complete responder experience
 */

interface Alert {
  id: number;
  lat: number;
  lng: number;
  type: string;
  message: string;
  created_at: string;
  status: string;
  video_url?: string;
  user_id?: string;
}

interface ResponderLocationState {
  lat: number;
  lng: number;
}

export default function ResponderDashboardExample() {
  // State management
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      lat: 40.7128,
      lng: -74.006,
      type: 'SOS',
      message: 'Medical emergency - chest pain',
      created_at: new Date().toISOString(),
      status: 'active',
      user_id: 'user-1',
    },
    {
      id: 2,
      lat: 40.758,
      lng: -73.9855,
      type: 'Video',
      message: 'Traffic accident - multiple vehicles',
      created_at: new Date(Date.now() - 120000).toISOString(),
      status: 'active',
      video_url: 'https://example.com/video.mp4',
      user_id: 'user-2',
    },
    {
      id: 3,
      lat: 40.6892,
      lng: -74.0445,
      type: 'Go Live',
      message: 'Building fire - evacuation in progress',
      created_at: new Date(Date.now() - 300000).toISOString(),
      status: 'active',
      user_id: 'user-3',
    },
  ]);

  const [responderLocation, setResponderLocation] = useState<ResponderLocationState>({
    lat: 40.7128,
    lng: -74.006,
  });

  const [filters, setFilters] = useState<AlertFilters>({
    type: [],
    distance: [0, 100],
    severity: [],
    searchQuery: '',
  });

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);

  // Calculate distance for each alert
  const alertsWithDistance = useMemo(() => {
    return alerts.map((alert) => {
      const navInfo = getNavigationInfo(
        responderLocation.lat,
        responderLocation.lng,
        alert.lat,
        alert.lng
      );
      return {
        ...alert,
        distance: navInfo.distanceKm,
        eta: navInfo.etaTime,
        bearing: navInfo.direction,
      };
    });
  }, [alerts, responderLocation]);

  // Apply filters
  const filteredAlerts = useMemo(() => {
    return alertsWithDistance.filter((alert) => {
      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(alert.type)) {
        return false;
      }

      // Distance filter
      if (
        alert.distance < filters.distance[0] ||
        alert.distance > filters.distance[1]
      ) {
        return false;
      }

      // Severity filter (calculated from distance and type)
      if (filters.severity.length > 0) {
        let severity = 'medium';
        if (alert.distance < 0.5 && (alert.type === 'SOS' || alert.type === 'Go Live')) {
          severity = 'critical';
        } else if (alert.distance < 1 || alert.type === 'SOS') {
          severity = 'high';
        }

        if (!filters.severity.includes(severity)) {
          return false;
        }
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matches =
          alert.message.toLowerCase().includes(query) ||
          alert.type.toLowerCase().includes(query);

        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [alertsWithDistance, filters]);

  // Sort by distance
  const sortedAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => a.distance - b.distance);
  }, [filteredAlerts]);

  const handleRespond = (alertId: number) => {
    console.log('Responder accepted alert:', alertId);
    // In production: update database
  };

  const handleDismiss = (alertId: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleNavigationStart = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowNavigation(true);
  };

  const handleStatusChange = (status: 'en_route' | 'on_scene' | 'complete') => {
    console.log('Status changed to:', status);
    // In production: update responder status in database
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Background location tracker */}
      <ResponderLocationTracker
        onLocationUpdate={(lat, lng) => {
          setResponderLocation({ lat, lng });
        }}
      />

      {/* Navigation view (full-screen modal) */}
      {showNavigation && selectedAlert && (
        <ResponderNavigationView
          alert={selectedAlert}
          responderLat={responderLocation.lat}
          responderLng={responderLocation.lng}
          onClose={() => setShowNavigation(false)}
          onStatusChange={handleStatusChange}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900">Emergency Responder Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Location: {responderLocation.lat.toFixed(4)}, {responderLocation.lng.toFixed(4)}
          </p>
        </div>

        {/* Filter system */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <AlertFilterSystem
            onFiltersChange={setFilters}
            activeAlertCount={alerts.length}
            filteredCount={sortedAlerts.length}
          />
        </div>

        {/* Alerts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAlerts.length > 0 ? (
            sortedAlerts.map((alert) => (
              <div key={alert.id} className="space-y-3">
                {/* Response Timer */}
                <ResponseTimer
                  alertCreatedAt={alert.created_at}
                  responderStatus="available"
                  maxWaitMinutes={30}
                  onTimeExpire={() => {
                    console.log('Alert time expired:', alert.id);
                  }}
                />

                {/* Alert Card */}
                <div
                  className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition"
                  onClick={() => handleNavigationStart(alert)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-900">{alert.type}</h3>
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {(alert as any).distance?.toFixed(1) || '?'} km
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">{alert.message}</p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">ETA</p>
                        <p className="font-bold text-green-600">{(alert as any).eta || '?'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Direction</p>
                        <p className="font-bold text-blue-600">{(alert as any).bearing || '?'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRespond(alert.id);
                        }}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition"
                      >
                        ✅ Respond
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(alert.id);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold text-sm transition"
                      >
                        ✕ Dismiss
                      </button>
                    </div>

                    <button
                      onClick={() => handleNavigationStart(alert)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition"
                    >
                      📍 Start Navigation
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600 font-semibold text-lg">No alerts match your filters</p>
              <p className="text-gray-500 mt-2">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{alerts.length}</p>
            <p className="text-sm text-gray-600">Active Alerts</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{sortedAlerts.length}</p>
            <p className="text-sm text-gray-600">Visible (Filtered)</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {alerts.length - sortedAlerts.length}
            </p>
            <p className="text-sm text-gray-600">Hidden by Filters</p>
          </div>
        </div>
      </div>
    </div>
  );
}
