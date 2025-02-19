import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';

export class WebSocketService {
  private io: Server;

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.data.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      socket.join(`user:${userId}`);

      socket.on('emergency:start', (data) => {
        this.handleEmergencyStart(userId, data);
      });

      socket.on('location:update', (data) => {
        this.handleLocationUpdate(userId, data);
      });
    });
  }

  private async handleEmergencyStart(userId: string, data: any) {
    // Notify nearby responders
    // Update emergency status
    this.io.to(`user:${userId}`).emit('emergency:status', {
      status: 'active',
      responders: []
    });
  }

  private async handleLocationUpdate(userId: string, location: any) {
    // Update user location in database
    // Notify relevant parties
    this.io.to(`user:${userId}`).emit('location:confirmed', {
      timestamp: new Date()
    });
  }

  public notifyEmergencyContacts(userId: string, message: string) {
    this.io.to(`user:${userId}`).emit('emergency:notification', { message });
  }
} 