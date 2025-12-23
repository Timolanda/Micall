'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { isWithinRadiusKm } from '../utils/distance';
import ResponderAlertCard from './ResponderAlertCard';
import AlertFilterSystem, { AlertFilters } from './AlertFilterSystem';

interface EmergencyAlert {
  id: number;
  user_id: string;
  type: string;
  message: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
  video_url?: string;
}

interface AlertWithDistance extends EmergencyAlert {
  distance: number;
}

export default function EmergencyNotification() {
  const [alerts, setAlerts] = useState<AlertWithDistance[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [responderCounts, setResponderCounts] = useState<Record<number, number>>({});
  const [filters, setFilters] = useState<AlertFilters>({
    type: [],
    distance: [0, 100],
    severity: [],
    searchQuery: '',
  });
  const RADIUS_KM = 1;

  // Watch user location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error('Emergency notification geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch active alerts
  useEffect(() => {
    if (!userLocation) return;
    let isActive = true;

    const fetchActiveAlerts = async () => {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!isActive) return;

      if (error) {
        console.error('Error fetching emergency alerts:', error);
        return;
      }

      const filtered = (data || [])
        .filter(
          (alert) =>
            typeof alert.lat === 'number' &&
            typeof alert.lng === 'number' &&
            isWithinRadiusKm(userLocation, [alert.lat, alert.lng], RADIUS_KM)
        )
        .map((alert) => ({
          ...alert,
          distance: calculateDistance(
            userLocation[0],
            userLocation[1],
            alert.lat,
            alert.lng
          ),
        }))
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      if (filtered.length > 0) {
        setAlerts(filtered);
        setShowNotifications(true);
        
        // Fetch responder counts for each alert
        filtered.forEach(alert => {
          fetchResponderCount(alert.id);
        });
      }
    };

    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 5000); // Refresh every 5s
    
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [userLocation]);

  // Fetch responder count for a specific alert
  const fetchResponderCount = async (alertId: number) => {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('id, responders:responders(count)')
        .eq('id', alertId)
        .single();

      if (!error && data) {
        const count = Array.isArray(data.responders) ? data.responders.length : 0;
        setResponderCounts(prev => ({
          ...prev,
          [alertId]: count
        }));
      }
    } catch (err) {
      console.error('Error fetching responder count:', err);
      // Default to 0 if table doesn't exist
      setResponderCounts(prev => ({
        ...prev,
        [alertId]: 0
      }));
    }
  };

  // Subscribe to new alerts
  useEffect(() => {
    if (!userLocation) return;

    const channel = supabase.channel('emergency-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
          filter: 'status=eq.active'
        },
        (payload) => {
          const newAlert = payload.new as EmergencyAlert;
          if (
            typeof newAlert.lat === 'number' &&
            typeof newAlert.lng === 'number' &&
            isWithinRadiusKm(userLocation, [newAlert.lat, newAlert.lng], RADIUS_KM)
          ) {
            const distance = calculateDistance(
              userLocation[0],
              userLocation[1],
              newAlert.lat,
              newAlert.lng
            );
            
            setAlerts((prev) => 
              [...prev, { ...newAlert, distance }].sort((a, b) => a.distance - b.distance)
            );
            setShowNotifications(true);
            
            fetchResponderCount(newAlert.id);

            // Play notification sound
            const audio = new Audio('/alert.mp3');
            audio.play().catch(() => {
              console.log('Emergency alert received!');
            });

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Emergency Alert', {
                body: newAlert.message,
                icon: '/alert-icon.png',
                tag: `alert-${newAlert.id}`,
                requireInteraction: true
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userLocation]);

  const handleRespond = async (alertId: number) => {
    try {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'responding' })
        .eq('id', alertId);
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error responding to alert:', error);
    }
  };

  const dismissAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const handleCall = (alertId: number) => {
    // In a real app, this would initiate a phone call
    console.log('Calling responder for alert', alertId);
  };

  const handleViewVideo = (alertId: number) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert?.video_url) {
      window.open(alert.video_url, '_blank');
    }
  };

  // Apply filters to alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Filter by type
      if (filters.type.length > 0 && !filters.type.includes(alert.type)) {
        return false;
      }

      // Filter by distance
      if (
        alert.distance < filters.distance[0] ||
        alert.distance > filters.distance[1]
      ) {
        return false;
      }

      // Filter by severity
      if (filters.severity.length > 0) {
        let alertSeverity = 'medium';
        if (alert.distance < 0.5 && (alert.type === 'SOS' || alert.type === 'Go Live')) {
          alertSeverity = 'critical';
        } else if (alert.distance < 1 || alert.type === 'SOS') {
          alertSeverity = 'high';
        }

        if (!filters.severity.includes(alertSeverity)) {
          return false;
        }
      }

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchMessage = alert.message.toLowerCase().includes(query);
        const matchType = alert.type.toLowerCase().includes(query);
        const matchLocation = `${alert.lat}${alert.lng}`.includes(query);

        if (!matchMessage && !matchType && !matchLocation) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, filters]);

  if (!showNotifications || alerts.length === 0 || !userLocation) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Filter System */}
      <div className="fixed top-4 left-4 right-4 max-w-md pointer-events-auto">
        <AlertFilterSystem
          onFiltersChange={setFilters}
          activeAlertCount={alerts.length}
          filteredCount={filteredAlerts.length}
        />
      </div>

      {/* Filtered Alerts */}
      <div className="fixed top-80 right-4 z-50 space-y-3 max-w-md max-h-[50vh] overflow-y-auto pointer-events-auto">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <ResponderAlertCard
              key={alert.id}
              alertId={alert.id}
              type={alert.type}
              message={alert.message}
              lat={alert.lat}
              lng={alert.lng}
              distance={alert.distance}
              userLocation={userLocation}
              createdAt={alert.created_at}
              responderCount={responderCounts[alert.id] || 0}
              videoUrl={alert.video_url}
              onRespond={handleRespond}
              onDismiss={dismissAlert}
              onCall={handleCall}
              onViewVideo={handleViewVideo}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 font-semibold">No alerts match your filters</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
} 