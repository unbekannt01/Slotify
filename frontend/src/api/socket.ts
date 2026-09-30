import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log(`[Socket] Connected to server: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.warn(`[Socket] Connection error:`, error.message);
    });
  }

  return socket;
}

export function subscribeToShop(
  shopId: string,
  callbacks: {
    onShopUpdated?: (data: any) => void;
    onSlotChanged?: (data: any) => void;
  }
): () => void {
  const s = getSocket();

  if (!s.connected) {
    s.connect();
  }

  // Join the specific shop room
  s.emit('join_shop', shopId);
  console.log(`[Socket] Emitted join_shop for ${shopId}`);

  const handleUpdate = (data: any) => {
    console.log(`[Socket] Received shop_updated for ${shopId}`);
    callbacks.onShopUpdated?.(data);
  };

  const handleSlot = (data: any) => {
    console.log(`[Socket] Received slot_changed for ${shopId}`);
    callbacks.onSlotChanged?.(data);
  };

  s.on('shop_updated', handleUpdate);
  s.on('slot_changed', handleSlot);

  // Return unsubscribe cleanup function
  return () => {
    s.emit('leave_shop', shopId);
    s.off('shop_updated', handleUpdate);
    s.off('slot_changed', handleSlot);
    console.log(`[Socket] Left shop ${shopId} and cleaned listeners`);
  };
}
