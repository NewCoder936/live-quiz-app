import { io } from "socket.io-client";

// Same-origin in both dev (Vite proxy) and production (server serves the
// built client), so no explicit URL is needed.
export const socket = io({
  autoConnect: true,
  reconnection: true,
});

// Plain socket.emit(event, data, cb) has no timeout — if the ack packet is
// lost mid-flight (a disconnect/reconnect blip, a restarted server), cb
// simply never fires and the UI hangs forever with no feedback. Wrapping
// every request in socket.io's built-in ack timeout guarantees callers
// always get a response, even if it's just "that request timed out".
export function emitWithAck(event, payload, timeoutMs = 8000) {
  return new Promise((resolve) => {
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return resolve({ ok: false, error: "Lost connection to the server. Please try again." });
      resolve(res);
    });
  });
}
