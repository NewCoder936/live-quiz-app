import { randomUUID } from "crypto";

// In-memory store. Keyed by room code — nothing here actually assumes a
// single active room, so lifting the "one room at a time" v1 constraint on
// the frontend (see spec: Explicitly Out of Scope) would not require
// changes to this module.
const rooms = new Map();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const BASE_POINTS = 1000;
const MIN_CORRECT_POINTS = 100;

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function nameKey(name) {
  return name.trim().toLowerCase();
}

// Fisher-Yates shuffle of a question's option positions, remapping
// correctIndex to match. The seed data clusters correct answers at index 1,
// so without this the correct color/shape would be predictable every round.
function shuffleOptions(question) {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correctIndex: order.indexOf(question.correctIndex),
  };
}

export function createRoom(questions) {
  const code = generateRoomCode();
  const room = {
    code,
    status: "lobby", // lobby | in_progress | reveal | finished
    currentQuestionIndex: -1,
    questions: questions.map(shuffleOptions),
    players: new Map(), // playerId -> Player
    currentQuestion: null, // runtime state for the active question
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  if (!code) return undefined;
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code) {
  rooms.delete(code);
}

export function addOrReconnectPlayer(room, name, socketId) {
  const key = nameKey(name);
  for (const player of room.players.values()) {
    if (player.nameKey === key) {
      player.socketId = socketId;
      player.connected = true;
      return { player, reconnected: true };
    }
  }
  const player = {
    id: randomUUID(),
    name: name.trim(),
    nameKey: key,
    socketId,
    connected: true,
    score: 0,
    answers: new Map(), // questionId -> PlayerAnswer
  };
  room.players.set(player.id, player);
  return { player, reconnected: false };
}

export function findPlayerBySocket(room, socketId) {
  for (const player of room.players.values()) {
    if (player.socketId === socketId) return player;
  }
  return undefined;
}

export function markDisconnected(room, socketId) {
  const player = findPlayerBySocket(room, socketId);
  if (player) player.connected = false;
  return player;
}

export function playerList(room) {
  return Array.from(room.players.values())
    .filter((p) => p.connected)
    .map((p) => ({ id: p.id, name: p.name, score: p.score }));
}

export function startQuiz(room) {
  room.status = "in_progress";
  room.currentQuestionIndex = -1;
}

export function currentQuestionDef(room) {
  return room.questions[room.currentQuestionIndex];
}

export function startQuestion(room) {
  room.currentQuestionIndex += 1;
  const q = currentQuestionDef(room);
  room.currentQuestion = {
    startedAt: Date.now(),
    timeLimitMs: q.timeLimitSeconds * 1000,
    ended: false,
  };
  room.status = "in_progress";
  return q;
}

function computePoints(remainingMs, totalMs) {
  if (totalMs <= 0) return MIN_CORRECT_POINTS;
  const ratio = Math.max(0, Math.min(1, remainingMs / totalMs));
  return Math.max(MIN_CORRECT_POINTS, Math.round(BASE_POINTS * ratio));
}

export function recordAnswer(room, playerId, selectedIndex) {
  const player = room.players.get(playerId);
  if (!player) throw new Error("Unknown player");
  const q = currentQuestionDef(room);
  const runtime = room.currentQuestion;
  if (!q || !runtime || runtime.ended) throw new Error("No active question");
  if (player.answers.has(q.id)) throw new Error("Already answered");

  const now = Date.now();
  const elapsed = now - runtime.startedAt;
  const remainingMs = Math.max(0, runtime.timeLimitMs - elapsed);
  const correct = selectedIndex === q.correctIndex;
  const points = correct ? computePoints(remainingMs, runtime.timeLimitMs) : 0;

  const answer = {
    questionId: q.id,
    selectedIndex,
    correct,
    answeredAtMs: now,
    points,
  };
  player.answers.set(q.id, answer);
  player.score += points;
  return { answer, player };
}

export function answeredCount(room) {
  const q = currentQuestionDef(room);
  if (!q) return 0;
  let count = 0;
  for (const player of room.players.values()) {
    if (player.answers.has(q.id)) count += 1;
  }
  return count;
}

export function endQuestion(room) {
  const q = currentQuestionDef(room);
  room.currentQuestion.ended = true;
  room.status = "reveal";

  const optionCounts = q.options.map(() => 0);
  let correctCount = 0;
  for (const player of room.players.values()) {
    const answer = player.answers.get(q.id);
    if (answer && answer.selectedIndex !== null && answer.selectedIndex !== undefined) {
      optionCounts[answer.selectedIndex] += 1;
    }
    if (answer && answer.correct) correctCount += 1;
  }

  return {
    correctIndex: q.correctIndex,
    optionCounts,
    correctCount,
    totalPlayers: room.players.size,
    leaderboard: getLeaderboard(room, 5),
  };
}

export function getLeaderboard(room, top = null) {
  const list = Array.from(room.players.values())
    .map((p) => {
      const q = currentQuestionDef(room);
      const lastAnswer = q ? p.answers.get(q.id) : undefined;
      return {
        id: p.id,
        name: p.name,
        score: p.score,
        lastDelta: lastAnswer ? lastAnswer.points : 0,
        connected: p.connected,
      };
    })
    .sort((a, b) => b.score - a.score);
  return top ? list.slice(0, top) : list;
}

export function finishQuiz(room) {
  room.status = "finished";
}

export function playerAnswerSummary(room, playerId) {
  const player = room.players.get(playerId);
  if (!player) return undefined;
  const rank = getLeaderboard(room).findIndex((p) => p.id === playerId) + 1;
  return { score: player.score, rank };
}

export function toCSV(room) {
  const header = ["Player Name", ...room.questions.map((q) => `Q${q.id}: ${q.text}`), "Final Score"];
  const rows = getLeaderboard(room).map((entry) => {
    const player = room.players.get(entry.id);
    const cells = room.questions.map((q) => {
      const answer = player.answers.get(q.id);
      if (!answer || answer.selectedIndex === null || answer.selectedIndex === undefined) return "No answer";
      const chosenText = q.options[answer.selectedIndex];
      return `${chosenText} (${answer.correct ? "Correct" : "Incorrect"})`;
    });
    return [player.name, ...cells, String(player.score)];
  });

  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [header, ...rows].map((row) => row.map(escape).join(","));
  return lines.join("\r\n");
}
