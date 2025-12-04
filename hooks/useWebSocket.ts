import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { env } from '../config/environment';
import { toast } from 'sonner';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface EmergencyAlert {
  type: string;
  location: Location;
  user: {
    name: string;
    phone: string;
  };
}

export function useWebSocket() {
  const socketRef = useRef<Socket>();
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      setIsConnected(false);
      return () => {};
    }

    socketRef.current = io(env.API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    const handleConnect = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      socketRef.current?.emit('authenticate', token);
    };

    const handleAuthenticated = () => {
      console.log('WebSocket authenticated');
    };

    const handleEmergencyAlert = (alert: EmergencyAlert) => {
      toast.error('Emergency Alert', {
        description: `${alert.user.name} needs help! Type: ${alert.type}`,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to emergency details
          }
        }
      });
    };

    const handleConnectError = (error: Error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Connection Error', {
        description: 'Failed to connect to emergency service'
      });
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('authenticated', handleAuthenticated);
    socketRef.current.on('emergency-alert', handleEmergencyAlert);
    socketRef.current.on('connect_error', handleConnectError);
    socketRef.current.on('disconnect', handleDisconnect);

    return () => {
      socketRef.current?.off('connect', handleConnect);
      socketRef.current?.off('authenticated', handleAuthenticated);
      socketRef.current?.off('emergency-alert', handleEmergencyAlert);
      socketRef.current?.off('connect_error', handleConnectError);
      socketRef.current?.off('disconnect', handleDisconnect);
      socketRef.current?.disconnect();
      setIsConnected(false);
    };
  }, [token, isAuthenticated]);

  const updateLocation = useCallback((location: Location) => {
    socketRef.current?.emit('location-update', location);
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  return {
    updateLocation,
    isConnected
  };
} 