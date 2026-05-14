// Layer realtime con Socket.io
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { verifyAccessToken } from "../utils/jwt.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Autenticazione JWT durante l handshake
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Missing token"));
      const payload = verifyAccessToken(token);
      socket.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch (err) {
      next(new Error("Auth failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    logger.info(`🔌 socket connected: ${id} (${role})`);

    socket.on("chat:join", (room) => socket.join(`chat:${room}`));
    socket.on("chat:leave", (room) => socket.leave(`chat:${room}`));
    socket.on("chat:typing", ({ room }) =>
      socket.to(`chat:${room}`).emit("chat:typing", { userId: id }),
    );

    socket.on("disconnect", (reason) =>
      logger.info(`🔌 socket disconnected: ${id} (${reason})`),
    );
  });

  logger.info("✓ Socket.io initialised");
  return io;
}

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};

/** Helper di comodo usati dai controller. */
export const emitToUser = (userId, event, payload) =>
  getIO().to(`user:${userId}`).emit(event, payload);

export const emitToRole = (role, event, payload) =>
  getIO().to(`role:${role}`).emit(event, payload);

export const emitToRoom = (room, event, payload) =>
  getIO().to(room).emit(event, payload);
