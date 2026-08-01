import { io } from "socket.io-client";

// Same-origin in both dev (Vite proxy) and production (server serves the
// built client), so no explicit URL is needed.
export const socket = io({
  autoConnect: true,
  reconnection: true,
});
