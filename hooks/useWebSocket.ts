import { useEffect, useRef, useCallback } from 'react';
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

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;

    socketRef.current = io(env.API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      socketRef.current?.emit('authenticate', token);
    });

    socketRef.current.on('authenticated', () => {
      console.log('WebSocket authenticated');
    });

    socketRef.current.on('emergency-alert', (alert: EmergencyAlert) => {
      toast.error('Emergency Alert', {
        description: `${alert.user.name} needs help! Type: ${alert.type}`,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to emergency details
          }
        }
      });
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Connection Error', {
        description: 'Failed to connect to emergency service'
      });
    });

    return () => {
      socketRef.current?.disconnect();
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
    isConnected: socketRef.current?.connected ?? false
  };
} 