'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import ResponderMap from '../components/ResponderMap';
import LoadingIndicator from '../components/LoadingIndicator';
import { supabase } from '../utils/supabaseClient';
import { Users, AlertTriangle, MapPin, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [nearbyResponders, setNearbyResponders] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Auth guard - must be first
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/landing');
      } else {
        setIsAuthenticated(true);
        setAuthChecked(true);
      }
    });
  }, [router]);

  // Get user location - only if authenticated
  useEffect(() => {
    if (!isAuthenticated || !navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAuthenticated]);

  // Fetch nearby responders count - only if authenticated and has location
  useEffect(() => {
    if (!isAuthenticated || !userLocation) return;

    const fetchResponders = async () => {
      try {
        const { data, error } = await supabase.rpc('get_nearby_responders', {
          lat: userLocation[0],
          lng: userLocation[1],
          radius_km: 1
        });
        
        if (!error && data) {
          setNearbyResponders(data.length);
        }
      } catch (error) {
        console.error('Error fetching responders:', error);
      }
    };

    fetchResponders();
    
    // Set up real-time subscription
    const channel = supabase.channel('responders-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, fetchResponders)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, userLocation]);

  const handleGoLive = async () => {
    setLoading(true);
    setEmergencyActive(true);

    // Simulate delay and vibration
    setTimeout(() => setLoading(false), 4000);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // Create emergency alert
    if (userLocation) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        if (userId) {
          await supabase.from('emergency_alerts').insert({
            user_id: userId,
            type: 'video',
            lat: userLocation[0],
            lng: userLocation[1],
            message: 'User activated Go Live - video recording in progress',
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Error creating emergency alert:', error);
      }
    }
  };

  const handleSOS = async () => {
    setEmergencyActive(true);
    
    // Create emergency alert
    if (userLocation) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        if (userId) {
          await supabase.from('emergency_alerts').insert({
            user_id: userId,
            type: 'SOS',
            lat: userLocation[0],
            lng: userLocation[1],
            message: 'SOS ALERT - User needs immediate assistance',
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Error creating emergency alert:', error);
      }
    }
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Checking authentication..." />
      </div>
    );
  }

  // Show loading while not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Redirecting..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-y-auto">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingIndicator label="Starting Live..." />
        </div>
      )}

      {/* Emergency Status Banner */}
      {emergencyActive && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-red-600 to-red-800 text-white p-4 animate-slide-in">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <AlertTriangle size={20} className="animate-pulse" />
            <span className="font-semibold text-lg">EMERGENCY ACTIVE - Responders Notified</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 pt-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full px-6 py-3 mb-6 border border-blue-500/30">
            <Shield size={20} className="text-blue-400" />
            <span className="text-blue-300 font-medium">Emergency Response System</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stay Safe, Stay Connected
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Instant emergency response with live video streaming and real-time location sharing
          </p>
        </div>

        {/* Main Action Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Go Live Button */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <GoLiveButton onStart={handleGoLive} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Go Live</h3>
              <p className="text-sm text-gray-400">Start video recording and share your location</p>
            </div>
          </div>

          {/* SOS Button */}
          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-2xl p-6 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <SOSButton onSOS={handleSOS} />
              </div>
              <h3 className="text-lg font-semibold mb-2">SOS Emergency</h3>
              <p className="text-sm text-gray-400">Immediate emergency alert to all responders</p>
            </div>
          </div>

          {/* Nearby Responders */}
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-6 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-green-600/20 rounded-full p-4 border border-green-500/50">
                  <Users size={32} className="text-green-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Nearby Responders</h3>
              <p className="text-2xl font-bold text-green-400 mb-1">{nearbyResponders}</p>
              <p className="text-sm text-gray-400">Available in your area</p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Location Services Active</span>
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm text-gray-300">Emergency Network Online</span>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold">Live Response Map</h2>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-600/50 h-64">
            <ResponderMap />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Real-time view of nearby emergency responders and your location
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center">
            <div className="text-2xl mb-2">📞</div>
            <div className="text-sm font-medium">Call 911</div>
          </button>
          <button className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Contacts</div>
          </button>
          <button className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">History</div>
          </button>
          <button className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
} 