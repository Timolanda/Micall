'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import AlertFilterSystem from '@/components/AlertFilterSystem';
import { MapPin, List, Map as MapIcon, Navigation, Settings, X } from 'lucide-react';
import Link from 'next/link';

// Dynamic imports to prevent hydration issues
const ResponderMap = dynamic(() => import('@/components/ResponderMap'), { ssr: false });
const EmergencyNotification = dynamic(() => import('@/components/EmergencyNotification'), { ssr: false });
const ResponderLocationTracker = dynamic(() => import('@/components/ResponderLocationTracker'), { ssr: false });
const ResponderNavigationView = dynamic(() => import('@/components/ResponderNavigationView'), { ssr: false });
const ResponseTimer = dynamic(() => import('@/components/ResponseTimer'), { ssr: false });
const LiveVideoPlayer = dynamic(() => import('@/components/LiveVideoPlayer'), { ssr: false });

interface Alert {
  id: number;
  lat: number;
  lng: number;
  type: string;
  message: string;
  created_at: string;
  status: string;
  user_id: string;
  video_url?: string;
}

export default function LivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [responderLat, setResponderLat] = useState(40.7128);
  const [responderLng, setResponderLng] = useState(-74.006);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

 // Redirect if not authenticated
useEffect(() => {
  if (!authLoading && !user) {
    router.replace('/auth/login');
  }
}, [authLoading, user, router]);

// Fetch alerts only when authenticated
useEffect(() => {
  if (!user) return;

  const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('emergency_alerts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAlerts((data as Alert[]) || []);
        setFilteredAlerts((data as Alert[]) || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();

    // Subscribe to real-time changes using modern Supabase API
    const channel = supabase
      .channel('emergency-alerts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'emergency_alerts' 
      }, (payload: any) => {
        // Refetch alerts when there are changes
        fetchAlerts();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Update elapsed time for selected alert
  useEffect(() => {
    if (!selectedAlert) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const created = new Date(selectedAlert.created_at).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - created) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedAlert]);

  // Prevent rendering before auth resolves
  if (authLoading) return null;
  if (!user) return null;

  // Handle location updates from background tracker
  const handleLocationUpdate = (lat: number, lng: number) => {
    setResponderLat(lat);
    setResponderLng(lng);
  };

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    let filtered = [...alerts];

    // Filter by type
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((alert) => filters.type.includes(alert.type));
    }

    // Filter by distance
    if (filters.distance && filters.distance.length === 2) {
      const [minKm, maxKm] = filters.distance;
      filtered = filtered.filter((alert) => {
        const distance = calculateDistance(
          responderLat,
          responderLng,
          alert.lat,
          alert.lng
        );
        return distance >= minKm && distance <= maxKm;
      });
    }

    // Filter by severity
    if (filters.severity && filters.severity.length > 0) {
      filtered = filtered.filter((alert) => filters.severity.includes(alert.type));
    }

    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((alert) =>
        alert.message.toLowerCase().includes(query) ||
        alert.type.toLowerCase().includes(query)
      );
    }

    setFilteredAlerts(filtered);
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handle alert selection for navigation
  const handleSelectAlert = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowNavigation(true);
  };

  // Handle closing navigation
  const handleCloseNavigation = () => {
    setShowNavigation(false);
    setSelectedAlert(null);
  };

  // If showing full navigation view
  if (showNavigation && selectedAlert) {
    return (
      <div className="relative">
        <ResponderNavigationView
          alert={selectedAlert}
          responderLat={responderLat}
          responderLng={responderLng}
          onStatusChange={(status: 'en_route' | 'on_scene' | 'complete') => {
            console.log('Status changed to:', status);
          }}
          onClose={handleCloseNavigation}
        />
        {/* Close button */}
        <button
          onClick={handleCloseNavigation}
          className="absolute top-6 left-6 z-50 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition border border-gray-200 hover:shadow-xl"
          title="Back to dashboard"
        >
          ← Back
        </button>

        {/* Video Modal */}
        {showVideoModal && selectedAlert && (
          <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden shadow-2xl">
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition"
                title="Close video"
              >
                <X className="w-5 h-5" />
              </button>
              
              <LiveVideoPlayer
                alertId={selectedAlert.id}
                videoUrl={selectedAlert.video_url}
                isLive={selectedAlert.status === 'active'}
                userLocation={{ latitude: selectedAlert.lat, longitude: selectedAlert.lng }}
                elapsedTime={elapsedTime}
                responderCount={0}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main responder dashboard view
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Background location tracker */}
      <ResponderLocationTracker onLocationUpdate={handleLocationUpdate} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Responder Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? 's' : ''} near you
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex gap-2">
              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    viewMode === 'map'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {/* Settings Link */}
              <Link
                href="/settings"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Sidebar - Filters & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Alert Filter System */}
          <AlertFilterSystem onFiltersChange={handleFilterChange} />

          {/* Alerts Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-red-600" />
              <h2 className="font-bold text-gray-900">
                Nearby Alerts
              </h2>
              <span className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {filteredAlerts.length}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredAlerts.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAlerts.map((alert) => {
                  const distance = calculateDistance(
                    responderLat,
                    responderLng,
                    alert.lat,
                    alert.lng
                  );

                  return (
                    <div
                      key={alert.id}
                      className="w-full p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-600 transition hover:shadow-md group"
                    >
                      <button
                        onClick={() => handleSelectAlert(alert)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{alert.type}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {alert.message}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 ml-2">
                            {distance.toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          ⏱️ <ResponseTimer alertCreatedAt={alert.created_at} />
                        </p>
                      </button>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSelectAlert(alert)}
                          className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
                        >
                          📍 Navigate
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm font-medium">No alerts match your filters</p>
                <p className="text-xs text-gray-500 mt-1">Adjust filters or check back soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {viewMode === 'map' ? (
            // Map View
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] lg:h-[700px]">
              {isLoading ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3 animate-pulse" />
                    <p className="text-gray-600 font-medium">Loading map...</p>
                  </div>
                </div>
              ) : filteredAlerts.length > 0 ? (
                <ResponderMap 
                  alerts={filteredAlerts}
                  responderLat={responderLat}
                  responderLng={responderLng}
                  onAlertClick={handleSelectAlert}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No alerts to display</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Check back soon or adjust your filters
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 bg-white rounded-lg border border-gray-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => {
                  const distance = calculateDistance(
                    responderLat,
                    responderLng,
                    alert.lat,
                    alert.lng
                  );

                  return (
                    <div
                      key={alert.id}
                      className="bg-white rounded-xl shadow-sm border-l-4 border-red-600 p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{alert.type}</h3>
                          <p className="text-gray-600 mt-1">{alert.message}</p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold whitespace-nowrap ml-4">
                          Active
                        </span>
                      </div>

                      {/* Alert Info Grid */}
                      <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">DISTANCE</p>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            {distance.toFixed(1)} km
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">ELAPSED TIME</p>
                          <p className="text-sm font-bold text-green-600 mt-1">
                            <ResponseTimer alertCreatedAt={alert.created_at} />
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">ETA</p>
                          <p className="text-sm font-bold text-purple-600 mt-1">
                            {Math.ceil((distance / 60) * 60)}m
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">LOCATION</p>
                          <p className="text-xs font-mono text-gray-700 mt-1">
                            {alert.lat.toFixed(2)}, {alert.lng.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleSelectAlert(alert)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-5 h-5" />
                        Start Navigation
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No alerts match your filters</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back soon or adjust your filter settings
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex justify-around items-center">
          <Link
            href="/"
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 hover:bg-gray-50 transition border-r border-gray-200"
          >
            <MapPin className="w-6 h-6 text-gray-700" />
            <span className="text-xs text-gray-700 mt-1">Home</span>
          </Link>

          <div className="flex-1 flex flex-col items-center justify-center py-3 px-2 hover:bg-gray-50 transition border-r border-gray-200 bg-blue-50">
            <Navigation className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-blue-600 mt-1 font-semibold">Live</span>
          </div>

          <Link
            href="/settings"
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 hover:bg-gray-50 transition"
          >
            <Settings className="w-6 h-6 text-gray-700" />
            <span className="text-xs text-gray-700 mt-1">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}