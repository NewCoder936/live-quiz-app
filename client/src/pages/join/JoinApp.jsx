import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { socket, emitWithAck } from "../../socket";
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

  const joinRoom = async ({ code, name }) => {
    setError(null);
    const res = await emitWithAck("player:join", { code, name });
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
      setError(null);
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
    const onConnect = async () => {
      if (!identityRef.current) return;
      const { code, name } = identityRef.current;
      const res = await emitWithAck("player:join", { code, name });
      if (res?.ok) return;
      // The room is gone (server restarted and lost all in-memory state,
      // e.g. a redeploy or the free hosting tier spinning down after
      // idling) — there's nothing to resume, so send the player back to
      // the join form instead of leaving them stuck on a dead screen.
      identityRef.current = null;
      localStorage.removeItem(STORAGE_KEY);
      setIdentity(null);
      setError(res?.error === "Room not found" ? "This quiz session ended. Please rejoin with the new room code." : res?.error || "Lost connection to the quiz.");
      setPhase("form");
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

  const submitAnswer = async (index) => {
    if (locked || !identity) return;
    setSelectedIndex(index);
    setLocked(true);
    const res = await emitWithAck("player:answer", { code: identity.code, playerId: identity.playerId, selectedIndex: index });
    if (!res?.ok) {
      // Unlock so they can retry — otherwise a lost/timed-out submission
      // leaves them stuck staring at "Answer locked in!" with no recourse
      // and no answer actually recorded.
      setLocked(false);
      setSelectedIndex(null);
      setError(res?.error || "Could not submit answer, please try again");
    }
  };

  if (phase === "form") {
    return <JoinForm prefillCode={roomCode} error={error} onJoin={joinRoom} />;
  }

  if (phase === "waiting") {
    return <PlayerWaiting name={identity?.name} code={identity?.code} />;
  }

  if (phase === "question" && activeQuestion) {
    return (
      <>
        {error && (
          <div
            className="error-banner"
            style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
          >
            {error}
          </div>
        )}
        <PlayerQuestion
          question={activeQuestion.question}
          timeLimitMs={activeQuestion.timeLimitMs}
          remainingMs={remainingMs}
          selectedIndex={selectedIndex}
          locked={locked}
          onAnswer={submitAnswer}
        />
      </>
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
