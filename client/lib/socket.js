import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
    socket = io(url, { transports: ["websocket", "polling"] });
  }
  return socket;
}
