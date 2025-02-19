import { Server as NetServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

declare module 'socket.io' {
  interface SocketUser extends Socket {
    userId?: string;
  }

  export class Server extends SocketIOServer {
    constructor(srv: NetServer, options?: any);
  }
} 