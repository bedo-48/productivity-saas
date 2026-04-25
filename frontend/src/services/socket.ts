import { io, Socket } from "socket.io-client";
import { getFreshIdToken, subscribeToIdToken } from "./firebase";

/**
 * Payloads émis par le backend. Doivent rester en phase avec
 * backend/src/controllers/taskController.js et backend/src/socket.js.
 */
export type TaskPayload = {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  archived: boolean;
  priority: "low" | "medium" | "high";
  due_date?: string;
  created_at: string;
  updated_at?: string;
  archived_at?: string;
  owner_name?: string;
  owner_email?: string;
  permission?: string;
};

export type ServerEvents = {
  "task:updated": (p: { task: TaskPayload }) => void;
  "task:deleted": (p: { taskId: number }) => void;
  "task:shared": (p: { task: TaskPayload; sharedBy: number; permission: "view" | "edit" }) => void;
};

type TypedSocket = Socket;

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";

let socket: TypedSocket | null = null;
let tokenUnsubscribe: (() => void) | null = null;
/** Track joined task rooms so we can rejoin after a reconnect. */
const joinedTaskRooms = new Set<number>();

/**
 * Ouvre la connexion Socket.IO avec le token Firebase courant.
 * - Idempotent : appel multiple renvoie la même instance
 * - Reconnecte automatiquement quand le token Firebase est rafraîchi
 * - Re-joint les rooms tâches après un reconnect
 */
export async function connectSocket(): Promise<TypedSocket | null> {
  if (!API_URL) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[socket] VITE_API_URL missing — real-time disabled");
    }
    return null;
  }

  if (socket && socket.connected) return socket;

  const token = await getFreshIdToken();
  if (!token) return null;

  socket = io(API_URL, {
    auth: { token },
    // Preferred websocket, but allow polling fallback when proxies block upgrade.
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Re-join rooms on every (re)connect — Socket.IO doesn't remember them server-side across reconnects.
  socket.on("connect", () => {
    for (const taskId of joinedTaskRooms) {
      socket?.emit("join-task", taskId);
    }
  });

  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.warn("[socket] connect_error", err.message);
  });

  // Swap the auth token whenever Firebase hands us a new one (hourly refresh, sign-in/out).
  if (!tokenUnsubscribe) {
    tokenUnsubscribe = subscribeToIdToken(async (user) => {
      if (!socket) return;
      if (!user) {
        disconnectSocket();
        return;
      }
      const freshToken = await getFreshIdToken();
      if (!freshToken) return;
      // socket.io-client lets us update the handshake auth then force a reconnect.
      socket.auth = { token: freshToken };
      if (socket.connected) {
        socket.disconnect().connect();
      } else {
        socket.connect();
      }
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (tokenUnsubscribe) {
    tokenUnsubscribe();
    tokenUnsubscribe = null;
  }
  joinedTaskRooms.clear();
}

/** Join the room dedicated to a task so we receive task:updated / task:deleted. */
export function joinTaskRoom(taskId: number): void {
  joinedTaskRooms.add(taskId);
  socket?.emit("join-task", taskId);
}

/** Sync the set of joined rooms with a list of currently-visible task IDs. */
export function syncTaskRooms(taskIds: number[]): void {
  const next = new Set(taskIds);
  // Leave rooms that are no longer visible.
  for (const existing of joinedTaskRooms) {
    if (!next.has(existing)) {
      socket?.emit("leave-task", existing);
      joinedTaskRooms.delete(existing);
    }
  }
  // Join newly-visible rooms.
  for (const id of next) {
    if (!joinedTaskRooms.has(id)) {
      joinedTaskRooms.add(id);
      socket?.emit("join-task", id);
    }
  }
}

export function leaveTaskRoom(taskId: number): void {
  if (joinedTaskRooms.delete(taskId)) {
    socket?.emit("leave-task", taskId);
  }
}

export function getSocket(): TypedSocket | null {
  return socket;
}

export type { TypedSocket as Socket };
