import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, type IUser } from '../models/User';
import { Emergency, type IEmergency } from '../models/Emergency';
import logger from '../utils/logger';
import { env } from '../config/environment';
import { verifyTokenWithRotation } from '../utils/auth';

interface SocketUser extends Socket {
  userId?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', async (socket: SocketUser) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = await verifyTokenWithRotation(token);
          socket.userId = decoded.id;
          this.addUserSocket(decoded.id, socket.id);
          socket.emit('authenticated');
        } catch (error) {
          socket.emit('error', 'Authentication failed');
          socket.disconnect();
        }
      });

      socket.on('location-update', (location: Location) => {
        if (socket.userId) {
          this.handleLocationUpdate(socket.userId, location);
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.removeUserSocket(socket.userId, socket.id);
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  private async handleLocationUpdate(userId: string, location: Location) {
    try {
      await User.findByIdAndUpdate(userId, {
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      });
    } catch (error) {
      logger.error('Location update failed:', error);
    }
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  public async notifyEmergencyContacts(emergency: IEmergency) {
    const user = await User.findById(emergency.user).populate('emergencyContacts');
    if (!user) return;

    for (const contact of user.emergencyContacts) {
      const sockets = this.userSockets.get(contact._id.toString());
      if (sockets) {
        sockets.forEach(socketId => {
          this.io.to(socketId).emit('emergency-alert', {
            type: emergency.type,
            location: emergency.location,
            user: {
              name: user.name,
              phone: user.phone
            }
          });
        });
      }
    }
  }

  public async broadcastToNearbyResponders(emergency: IEmergency) {
    const nearbyResponders = await User.find({
      'location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [emergency.location.longitude, emergency.location.latitude]
          },
          $maxDistance: 5000 // 5km radius
        }
      },
      'isResponder': true
    }) as IUser[];

    nearbyResponders.forEach(responder => {
      const sockets = this.userSockets.get(responder._id.toString());
      if (sockets) {
        sockets.forEach(socketId => {
          this.io.to(socketId).emit('emergency-nearby', {
            emergencyId: emergency._id,
            type: emergency.type,
            location: emergency.location,
            distance: this.calculateDistance(
              responder.location,
              emergency.location
            )
          });
        });
      }
    });
  }

  private calculateDistance(point1: any, point2: any): number {
    // Haversine formula implementation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
} 