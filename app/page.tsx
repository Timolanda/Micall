'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import ResponderMap from '../components/ResponderMap';
import LoadingIndicator from '../components/LoadingIndicator';
import { supabase } from '../utils/supabaseClient';
import { Users, AlertTriangle, MapPin, Shield, Zap } from 'lucide-react';
import Modal from '../components/Modal';
import { useContacts } from '../hooks/useContacts';
import { useHistory } from '../hooks/useHistory';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [nearbyResponders, setNearbyResponders] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosLoading, setSOSLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || null;
  const { contacts, loading: contactsLoading, error: contactsError } = useContacts(userId);
  const { history, loading: historyLoading, error: historyError } = useHistory(userId);

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

    // Remove countdown: Go Live immediately
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // Create emergency alert
    if (!userLocation) {
      toast.warning('Enable location services before going live.');
      setLoading(false);
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const userEmail = userData.user?.email;
      if (userId) {
        // Fallback: Ensure profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        if (!profile) {
          // Create minimal profile
          await supabase.from('profiles').insert({
            id: userId,
            full_name: userEmail || 'User',
          });
        }
        await supabase.from('emergency_alerts').insert({
          user_id: userId,
          type: 'video',
          lat: userLocation[0],
          lng: userLocation[1],
          message: 'User activated Go Live - video recording in progress',
          status: 'active'
        });
        toast.success('Live alert created. Recording started.');
      }
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      toast.error('Unable to create live alert.');
    }
    setLoading(false);
  };

  const handleSOS = () => {
    setShowSOSModal(true);
  };

  const handleSOSSubmit = async (emergencyType: string) => {
    setSOSLoading(true);
    setEmergencyActive(true);
    setShowSOSModal(false);
    // Create emergency alert
    if (!userLocation) {
      toast.warning('Enable location services before sending SOS alerts.');
      setSOSLoading(false);
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userId) {
        await supabase.from('emergency_alerts').insert({
          user_id: userId,
          type: emergencyType,
          lat: userLocation[0],
          lng: userLocation[1],
          message: `${emergencyType} ALERT - User needs immediate assistance`,
          status: 'active'
        });
        toast.success(`${emergencyType} alert sent to responders.`);
      }
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      toast.error('Unable to send SOS alert.');
    }
    setSOSLoading(false);
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
      {(loading || sosLoading) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingIndicator label={sosLoading ? 'Sending SOS...' : 'Starting Live...'} />
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

      {/* SOS Emergency Type Modal */}
      {showSOSModal && (
        <Modal onClose={() => setShowSOSModal(false)}>
          <h2 className="text-xl font-bold mb-4">Select Emergency Type</h2>
          <div className="grid gap-3">
            {['Health', 'Assault', 'Fire', 'Accident', 'Other'].map((type) => (
              <button
                key={type}
                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg shadow-md text-white"
                onClick={() => handleSOSSubmit(type)}
                disabled={sosLoading}
              >
                {type}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Contacts Modal */}
      {showContacts && (
        <Modal onClose={() => setShowContacts(false)}>
          <h2 className="text-xl font-bold mb-4">Emergency Contacts</h2>
          {contactsLoading ? (
            <div>Loading...</div>
          ) : contactsError ? (
            <div className="text-red-500">{contactsError}</div>
          ) : contacts.length === 0 ? (
            <div className="text-zinc-400">No contacts found.</div>
          ) : (
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-zinc-400">{c.phone}</div>
                  </div>
                  <a href={`tel:${c.phone}`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm">Call</a>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* History Modal */}
      {showHistory && (
        <Modal onClose={() => setShowHistory(false)}>
          <h2 className="text-xl font-bold mb-4">Emergency History</h2>
          {historyLoading ? (
            <div>Loading...</div>
          ) : historyError ? (
            <div className="text-red-500">{historyError}</div>
          ) : history.length === 0 ? (
            <div className="text-zinc-400">No emergency history yet.</div>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{h.type}</span>
                    <span className="text-xs text-zinc-400">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-zinc-300">{h.message}</div>
                  {h.video_url && (
                    <a href={h.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-1 inline-block">View Video</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
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
                <SOSButton onSOS={handleSOS} autoSend={false} location={userLocation} />
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
          <button
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center"
            onClick={() => window.location.href = 'tel:999'}
          >
            <div className="text-2xl mb-2">📞</div>
            <div className="text-sm font-medium">Call 999</div>
          </button>
          <button
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center"
            onClick={() => setShowContacts(true)}
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Contacts</div>
          </button>
          <button
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center"
            onClick={() => setShowHistory(true)}
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">History</div>
          </button>
          <button
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-center"
            onClick={() => router.push('/settings')}
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
} 