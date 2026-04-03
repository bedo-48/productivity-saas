import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  // Authenticate every socket connection with JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Each user joins their own personal room for notifications
    socket.join(`user:${socket.userId}`);

    socket.on("join-task", (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on("leave-task", (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
