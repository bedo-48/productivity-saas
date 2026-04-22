import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getFirebaseAuth } from "./config/firebaseAdmin.js";
import { findUserById, upsertUserFromFirebase } from "./models/userModel.js";

const ALLOW_LEGACY_JWT = process.env.ALLOW_LEGACY_JWT !== "false";

async function resolveSocketUser(token) {
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token, true);
    const user = await upsertUserFromFirebase({
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      name: decoded.name,
      picture: decoded.picture,
    });
    return user.id;
  } catch (firebaseErr) {
    if (!ALLOW_LEGACY_JWT || !process.env.JWT_SECRET) throw firebaseErr;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findUserById(payload.id);
      if (!user) throw new Error("Legacy user not found");
      return user.id;
    } catch {
      throw firebaseErr;
    }
  }
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      socket.userId = await resolveSocketUser(token);
      next();
    } catch (err) {
      console.warn("[socket:auth] Rejected connection", { message: err?.message });
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
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
