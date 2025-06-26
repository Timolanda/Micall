import { Socket } from 'socket.io';

export interface SocketUser extends Socket {
  userId?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface EmergencyAlert {
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  user: {
    name?: string;
    phone?: string;
  };
}

export interface EmergencyNearby {
  emergencyId: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
}

export interface SocketEvents {
  authenticate: (token: string) => void;
  'location-update': (location: Location) => void;
  'emergency-alert': (data: EmergencyAlert) => void;
  'emergency-nearby': (data: EmergencyNearby) => void;
  error: (message: string) => void;
  authenticated: () => void;
  disconnect: () => void;
} 