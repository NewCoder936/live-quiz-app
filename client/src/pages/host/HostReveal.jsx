import { OPTION_META, Shape } from "../../optionMeta";
import Leaderboard from "../../components/Leaderboard";

export default function HostReveal({ reveal, questionIndex, totalQuestions, onNext }) {
  const { correctIndex, optionCounts, correctCount, totalPlayers, leaderboard } = reveal;
  const maxCount = Math.max(1, ...optionCounts);

  return (
    <div className="container" style={{ gap: "1.5rem" }}>
      <div className="muted" style={{ fontWeight: 700 }}>
        Question {questionIndex + 1} of {totalQuestions} — Results
      </div>

      <h1 style={{ margin: 0 }}>
        {correctCount} / {totalPlayers} got it right
      </h1>

      <div style={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {optionCounts.map((count, i) => {
          const meta = OPTION_META[i];
          const isCorrect = i === correctIndex;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 28 }}>
                <Shape shape={meta.shape} size={22} color={isCorrect ? meta.color : "#ccc"} />
              </div>
              <div
                style={{
                  flex: 1,
                  background: "#f2f2f2",
                  borderRadius: 8,
                  overflow: "hidden",
                  height: "2.2rem",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: isCorrect ? meta.color : "#c9c9c9",
                    height: "100%",
                    transition: "width 0.4s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                    color: isCorrect ? "white" : "#444",
                  }}
                >
                  {count}
                </span>
              </div>
              {isCorrect && (
                <span style={{ color: "var(--opt-green)", fontWeight: 700, fontSize: "0.85rem" }}>Correct</span>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ marginBottom: 0 }}>Leaderboard</h2>
      <Leaderboard entries={leaderboard} />

      <button className="btn btn-primary" onClick={onNext}>
        Next Question
      </button>
    </div>
  );
}
