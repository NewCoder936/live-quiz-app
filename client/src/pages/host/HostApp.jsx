import { useCallback, useEffect, useState } from "react";
import { socket, emitWithAck } from "../../socket";
import HostLobby from "./HostLobby";
import HostQuestion from "./HostQuestion";
import HostReveal from "./HostReveal";
import HostFinal from "./HostFinal";

const STORAGE_KEY = "quiz.hostRoomCode";

export default function HostApp() {
  const [phase, setPhase] = useState("create"); // create | lobby | question | reveal | final
  const [code, setCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null); // {index, total, question, startedAt, timeLimitMs}
  const [remainingMs, setRemainingMs] = useState(0);
  const [progress, setProgress] = useState({ answeredCount: 0, totalPlayers: 0 });
  const [reveal, setReveal] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onLobbyUpdate = ({ players }) => setPlayers(players);
    const onQuestionStart = ({ index, total, question, timeLimitMs }) => {
      setActiveQuestion({ index, total, question, timeLimitMs });
      setRemainingMs(timeLimitMs);
      setProgress({ answeredCount: 0, totalPlayers: 0 });
      setReveal(null);
      setPhase("question");
    };
    const onTimerTick = ({ remainingMs }) => setRemainingMs(remainingMs);
    const onAnswerProgress = (p) => setProgress(p);
    const onQuestionEnd = (payload) => {
      setReveal(payload);
      setPhase("reveal");
    };
    const onQuizFinished = ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase("final");
    };

    socket.on("room:lobby_update", onLobbyUpdate);
    socket.on("question:start", onQuestionStart);
    socket.on("timer:tick", onTimerTick);
    socket.on("answer:progress", onAnswerProgress);
    socket.on("question:end", onQuestionEnd);
    socket.on("quiz:finished", onQuizFinished);

    return () => {
      socket.off("room:lobby_update", onLobbyUpdate);
      socket.off("question:start", onQuestionStart);
      socket.off("timer:tick", onTimerTick);
      socket.off("answer:progress", onAnswerProgress);
      socket.off("question:end", onQuestionEnd);
      socket.off("quiz:finished", onQuizFinished);
    };
  }, []);

  const applyRoomSnapshot = useCallback((room) => {
    setCode(room.code);
    setPlayers(room.players);
    setTotalQuestions(room.totalQuestions);
    localStorage.setItem(STORAGE_KEY, room.code);
  }, []);

  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    if (!savedCode) return;
    emitWithAck("host:watch_room", { code: savedCode }).then((res) => {
      if (!res?.ok) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      applyRoomSnapshot(res.room);
      if (res.room.status === "finished") {
        setFinalLeaderboard(res.finalLeaderboard || []);
        setPhase("final");
      } else if (res.activeQuestion) {
        const { index, total, question, timeLimitMs, remainingMs, answeredCount } = res.activeQuestion;
        setActiveQuestion({ index, total, question, timeLimitMs });
        setRemainingMs(remainingMs);
        setProgress({ answeredCount, totalPlayers: res.room.players.length });
        setPhase("question");
      } else if (res.room.status === "reveal") {
        setPhase("reveal");
      } else {
        setPhase("lobby");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createQuiz = async () => {
    setError(null);
    const res = await emitWithAck("host:create_room", {});
    if (!res?.ok) return setError(res?.error || "Could not create quiz");
    applyRoomSnapshot(res.room);
    setPhase("lobby");
  };

  // A missing room means the server restarted (e.g. redeploy, or the free
  // hosting tier spinning down after idling) and lost all in-memory state —
  // there's no session to recover, so send the host back to start a new one
  // instead of leaving them stuck on a screen that silently does nothing.
  const handleRoomGone = (res) => {
    if (res?.error !== "Room not found") return false;
    localStorage.removeItem(STORAGE_KEY);
    setPhase("create");
    setError("This quiz session ended (the server restarted). Please create a new quiz.");
    return true;
  };

  const startQuiz = async () => {
    setError(null);
    const res = await emitWithAck("host:start_quiz", { code });
    if (!res?.ok && !handleRoomGone(res)) setError(res?.error || "Could not start quiz");
  };

  const nextQuestion = async () => {
    setError(null);
    const res = await emitWithAck("host:next_question", { code });
    if (!res?.ok) handleRoomGone(res) || setError(res?.error || "Could not advance to the next question");
  };

  const newQuiz = async () => {
    localStorage.removeItem(STORAGE_KEY);
    const res = await emitWithAck("host:new_quiz", {});
    if (!res?.ok) return setError(res?.error || "Could not create quiz");
    applyRoomSnapshot(res.room);
    setActiveQuestion(null);
    setReveal(null);
    setFinalLeaderboard([]);
    setPhase("lobby");
  };

  if (phase === "create") {
    return (
      <div className="container">
        <h1>Live Quiz</h1>
        <p className="muted">Run a live, synced quiz on the shared screen. Players join with their phones.</p>
        {error && <div className="error-banner">{error}</div>}
        <button className="btn btn-primary" onClick={createQuiz}>
          Create Quiz
        </button>
      </div>
    );
  }

  // Timeouts/errors can now surface from any screen (e.g. clicking "Next
  // Question" during a connection blip), not just the ones that already
  // render {error} inline — so float it on top instead of wiring it through
  // every child component.
  const errorToast = error && phase !== "create" && phase !== "lobby" && (
    <div className="error-banner" style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
      {error}
    </div>
  );

  if (phase === "lobby") {
    return <HostLobby code={code} players={players} totalQuestions={totalQuestions} error={error} onStart={startQuiz} />;
  }

  if (phase === "question" && activeQuestion) {
    return (
      <>
        {errorToast}
        <HostQuestion activeQuestion={activeQuestion} remainingMs={remainingMs} progress={progress} />
      </>
    );
  }

  if (phase === "reveal" && reveal) {
    return (
      <>
        {errorToast}
        <HostReveal
          reveal={reveal}
          questionIndex={activeQuestion?.index ?? 0}
          totalQuestions={activeQuestion?.total ?? totalQuestions}
          onNext={nextQuestion}
        />
      </>
    );
  }

  if (phase === "final") {
    return <HostFinal leaderboard={finalLeaderboard} code={code} onNewQuiz={newQuiz} />;
  }

  return (
    <div className="container">
      <p className="muted">Loading…</p>
    </div>
  );
}
