import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a specific shop room to listen for live updates
    socket.on('join_shop', (shopId: string) => {
      if (shopId) {
        const room = `shop:${shopId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
        socket.emit('joined_shop', { shopId, room });
      }
    });

    // Leave a specific shop room
    socket.on('leave_shop', (shopId: string) => {
      if (shopId) {
        const room = `shop:${shopId}`;
        socket.leave(room);
        console.log(`[Socket.io] Socket ${socket.id} left room ${room}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io server has not been initialized!');
  }
  return io;
}

/**
 * Broadcasts an update event to all subscribers of a given shop's room
 */
export function broadcastToShop(shopId: string, event: string, payload: any): void {
  if (io) {
    const room = `shop:${shopId}`;
    io.to(room).emit(event, payload);
    console.log(`[Socket.io] Broadcast '${event}' to ${room}`);
  }
}
