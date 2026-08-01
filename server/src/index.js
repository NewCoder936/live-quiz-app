import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import {
  createRoom,
  getRoom,
  addOrReconnectPlayer,
  markDisconnected,
  findPlayerBySocket,
  playerList,
  startQuiz as startQuizState,
  startQuestion,
  currentQuestionDef,
  recordAnswer,
  answeredCount,
  endQuestion,
  finishQuiz,
  getLeaderboard,
  playerAnswerSummary,
  toCSV,
} from "./rooms.js";
import { loadSeedQuestions } from "./questions.js";

// In production this is the only process (it also serves the built client),
// so it's safe and correct to bind to the platform-assigned PORT. In dev,
// PORT is often already claimed by tooling that launches the Vite client,
// so SERVER_PORT (or the 3001 default) is used instead to avoid a collision.
const PORT = process.env.NODE_ENV === "production" ? process.env.PORT || 3001 : process.env.SERVER_PORT || 3001;
const seedQuestions = loadSeedQuestions();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// code -> { interval, timeout }
const roomTimers = new Map();

function clearRoomTimers(code) {
  const timers = roomTimers.get(code);
  if (timers) {
    clearInterval(timers.interval);
    clearTimeout(timers.timeout);
    roomTimers.delete(code);
  }
}

function publicQuestion(q) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    timeLimitSeconds: q.timeLimitSeconds,
  };
}

function beginQuestion(room) {
  clearRoomTimers(room.code);
  const q = startQuestion(room);

  io.to(room.code).emit("question:start", {
    index: room.currentQuestionIndex,
    total: room.questions.length,
    question: publicQuestion(q),
    startedAt: room.currentQuestion.startedAt,
    timeLimitMs: room.currentQuestion.timeLimitMs,
  });
  io.to(room.code).emit("answer:progress", { answeredCount: 0, totalPlayers: playerList(room).length });

  const interval = setInterval(() => {
    const runtime = room.currentQuestion;
    if (!runtime || runtime.ended) return;
    const remainingMs = Math.max(0, runtime.timeLimitMs - (Date.now() - runtime.startedAt));
    io.to(room.code).emit("timer:tick", { remainingMs });
    if (remainingMs <= 0) {
      finishQuestion(room);
    }
  }, 1000);

  const timeout = setTimeout(() => {
    finishQuestion(room);
  }, room.currentQuestion.timeLimitMs + 150);

  roomTimers.set(room.code, { interval, timeout });
}

function finishQuestion(room) {
  if (!room.currentQuestion || room.currentQuestion.ended) return;
  clearRoomTimers(room.code);
  const reveal = endQuestion(room);
  io.to(room.code).emit("question:end", reveal);

  for (const player of room.players.values()) {
    if (!player.connected) continue;
    const q = currentQuestionDef(room);
    const answer = player.answers.get(q.id);
    const summary = playerAnswerSummary(room, player.id);
    io.to(player.socketId).emit("player:result", {
      correct: answer ? answer.correct : false,
      points: answer ? answer.points : 0,
      score: summary.score,
      rank: summary.rank,
      totalPlayers: room.players.size,
    });
  }
}

function roomSummary(room) {
  return {
    code: room.code,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    players: playerList(room),
  };
}

io.on("connection", (socket) => {
  socket.on("host:create_room", (_payload, ack) => {
    const room = createRoom(seedQuestions.map((q) => ({ ...q })));
    socket.join(room.code);
    socket.data.isHost = true;
    socket.data.roomCode = room.code;
    ack?.({ ok: true, room: roomSummary(room) });
  });

  socket.on("host:watch_room", ({ code }, ack) => {
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: "Room not found" });
    socket.join(room.code);
    socket.data.isHost = true;
    socket.data.roomCode = room.code;

    const payload = { ok: true, room: roomSummary(room) };
    if (room.status === "in_progress" && room.currentQuestion && !room.currentQuestion.ended) {
      const q = currentQuestionDef(room);
      const remainingMs = Math.max(0, room.currentQuestion.timeLimitMs - (Date.now() - room.currentQuestion.startedAt));
      payload.activeQuestion = {
        index: room.currentQuestionIndex,
        total: room.questions.length,
        question: publicQuestion(q),
        startedAt: room.currentQuestion.startedAt,
        timeLimitMs: room.currentQuestion.timeLimitMs,
        remainingMs,
        answeredCount: answeredCount(room),
      };
    }
    if (room.status === "finished") {
      payload.finalLeaderboard = getLeaderboard(room);
    }
    ack?.(payload);
  });

  socket.on("player:join", ({ code, name }, ack) => {
    if (!name || !name.trim()) return ack?.({ ok: false, error: "Name is required" });
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: "Room not found" });

    const { player, reconnected } = addOrReconnectPlayer(room, name, socket.id);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;

    io.to(room.code).emit("room:lobby_update", { players: playerList(room) });

    const payload = {
      ok: true,
      playerId: player.id,
      reconnected,
      room: roomSummary(room),
    };

    if (room.status === "in_progress" && room.currentQuestion && !room.currentQuestion.ended) {
      const q = currentQuestionDef(room);
      const remainingMs = Math.max(0, room.currentQuestion.timeLimitMs - (Date.now() - room.currentQuestion.startedAt));
      payload.activeQuestion = {
        index: room.currentQuestionIndex,
        total: room.questions.length,
        question: publicQuestion(q),
        remainingMs,
        alreadyAnswered: player.answers.has(q.id),
      };
    } else if (room.status === "finished") {
      const summary = playerAnswerSummary(room, player.id);
      payload.finalResult = summary;
    }

    ack?.(payload);
  });

  socket.on("host:start_quiz", ({ code }, ack) => {
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: "Room not found" });
    if (room.players.size === 0) return ack?.({ ok: false, error: "No players have joined yet" });
    startQuizState(room);
    beginQuestion(room);
    ack?.({ ok: true });
  });

  socket.on("player:answer", ({ code, playerId, selectedIndex }, ack) => {
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: "Room not found" });
    try {
      recordAnswer(room, playerId, selectedIndex);
      const count = answeredCount(room);
      io.to(room.code).emit("answer:progress", { answeredCount: count, totalPlayers: playerList(room).length });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:next_question", ({ code }, ack) => {
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: "Room not found" });
    if (room.currentQuestionIndex + 1 >= room.questions.length) {
      finishQuiz(room);
      const leaderboard = getLeaderboard(room);
      io.to(room.code).emit("quiz:finished", { leaderboard });
      for (const player of room.players.values()) {
        if (!player.connected) continue;
        const summary = playerAnswerSummary(room, player.id);
        io.to(player.socketId).emit("player:finished", summary);
      }
    } else {
      beginQuestion(room);
    }
    ack?.({ ok: true });
  });

  socket.on("host:new_quiz", (_payload, ack) => {
    const room = createRoom(seedQuestions.map((q) => ({ ...q })));
    socket.join(room.code);
    socket.data.isHost = true;
    socket.data.roomCode = room.code;
    ack?.({ ok: true, room: roomSummary(room) });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    if (socket.data.playerId) {
      markDisconnected(room, socket.id);
      io.to(room.code).emit("room:lobby_update", { players: playerList(room) });
    }
  });
});

app.get("/api/rooms/:code/export.csv", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).send("Room not found");
  const csv = toCSV(room);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${room.code}.csv"`);
  res.send(csv);
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production, the client is built into client/dist and served by this
// same process so the whole app is one long-running Node service (needed
// for WebSockets on free hosts like Render.com).
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Quiz server listening on port ${PORT}`);
});
