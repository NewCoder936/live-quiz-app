import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../../socket";
import JoinForm from "./JoinForm";
import PlayerWaiting from "./PlayerWaiting";
import PlayerQuestion from "./PlayerQuestion";
import PlayerReveal from "./PlayerReveal";
import PlayerFinal from "./PlayerFinal";

const STORAGE_KEY = "quiz.player";

export default function JoinApp() {
  const { roomCode } = useParams();
  const [phase, setPhase] = useState("form"); // form | waiting | question | reveal | final
  const [identity, setIdentity] = useState(null); // {code, name, playerId}
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState(null);
  const [finalSummary, setFinalSummary] = useState(null);

  const identityRef = useRef(null);

  const joinRoom = ({ code, name }) => {
    setError(null);
    socket.emit("player:join", { code, name }, (res) => {
      if (!res?.ok) {
        setError(res?.error || "Could not join room");
        return;
      }
      const nextIdentity = { code, name, playerId: res.playerId };
      identityRef.current = nextIdentity;
      setIdentity(nextIdentity);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity));

      if (res.room.status === "finished") {
        setFinalSummary(res.finalResult || null);
        setPhase("final");
      } else if (res.activeQuestion) {
        const { question, timeLimitMs, remainingMs, alreadyAnswered } = res.activeQuestion;
        setActiveQuestion({ question, timeLimitMs });
        setRemainingMs(remainingMs);
        setLocked(alreadyAnswered);
        setSelectedIndex(null);
        setPhase("question");
      } else {
        setPhase("waiting");
      }
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only silently rejoin from storage if it's for the room the user is
        // actually landing on. A fresh QR code (different/no room in the
        // URL) means a new session — don't resurrect a stale one.
        const sameRoom = !roomCode || parsed?.code?.toUpperCase() === roomCode.toUpperCase();
        if (parsed?.code && parsed?.name && sameRoom) {
          joinRoom({ code: parsed.code, name: parsed.name });
          return;
        }
        if (!sameRoom) {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore malformed storage
      }
    }
    // no saved identity: nothing to do, JoinForm renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onQuestionStart = ({ question, timeLimitMs }) => {
      setActiveQuestion({ question, timeLimitMs });
      setRemainingMs(timeLimitMs);
      setSelectedIndex(null);
      setLocked(false);
      setResult(null);
      setPhase("question");
    };
    const onTimerTick = ({ remainingMs }) => setRemainingMs(remainingMs);
    const onPlayerResult = (payload) => {
      setResult(payload);
      setPhase("reveal");
    };
    const onPlayerFinished = (summary) => {
      setFinalSummary(summary);
      setPhase("final");
    };
    const onConnect = () => {
      if (identityRef.current) {
        const { code, name } = identityRef.current;
        socket.emit("player:join", { code, name }, () => {});
      }
    };

    socket.on("question:start", onQuestionStart);
    socket.on("timer:tick", onTimerTick);
    socket.on("player:result", onPlayerResult);
    socket.on("player:finished", onPlayerFinished);
    socket.on("connect", onConnect);

    return () => {
      socket.off("question:start", onQuestionStart);
      socket.off("timer:tick", onTimerTick);
      socket.off("player:result", onPlayerResult);
      socket.off("player:finished", onPlayerFinished);
      socket.off("connect", onConnect);
    };
  }, []);

  const submitAnswer = (index) => {
    if (locked || !identity) return;
    setSelectedIndex(index);
    setLocked(true);
    socket.emit("player:answer", { code: identity.code, playerId: identity.playerId, selectedIndex: index }, (res) => {
      if (!res?.ok) {
        setError(res?.error || "Could not submit answer");
      }
    });
  };

  if (phase === "form") {
    return <JoinForm prefillCode={roomCode} error={error} onJoin={joinRoom} />;
  }

  if (phase === "waiting") {
    return <PlayerWaiting name={identity?.name} code={identity?.code} />;
  }

  if (phase === "question" && activeQuestion) {
    return (
      <PlayerQuestion
        question={activeQuestion.question}
        timeLimitMs={activeQuestion.timeLimitMs}
        remainingMs={remainingMs}
        selectedIndex={selectedIndex}
        locked={locked}
        onAnswer={submitAnswer}
      />
    );
  }

  if (phase === "reveal") {
    return <PlayerReveal result={result} />;
  }

  if (phase === "final") {
    return <PlayerFinal score={finalSummary?.score ?? 0} rank={finalSummary?.rank} />;
  }

  return (
    <div className="container">
      <p className="muted">Loading…</p>
    </div>
  );
}
