// ════════════════════════════════════════════════════════════════
//  Socket.io client (auto-connect once user has access token)
// ════════════════════════════════════════════════════════════════
import { io } from 'socket.io-client';
import { tokens } from './api.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

let socket = null;

export const getSocket = () => {
  if (socket) return socket;
  socket = io(WS_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: () => ({ token: tokens.access }),
    reconnection: true,
    reconnectionDelay: 1500,
    reconnectionAttempts: Infinity,
  });
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
