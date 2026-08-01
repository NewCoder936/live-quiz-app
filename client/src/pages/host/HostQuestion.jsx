import { OPTION_META, Shape } from "../../optionMeta";
import Timer from "../../components/Timer";

export default function HostQuestion({ activeQuestion, remainingMs, progress }) {
  const { index, total, question, timeLimitMs } = activeQuestion;

  return (
    <div className="container" style={{ justifyContent: "flex-start", paddingTop: "2rem", gap: "1.5rem" }}>
      <div className="muted" style={{ fontWeight: 700 }}>
        Question {index + 1} of {total}
      </div>

      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)", maxWidth: "60rem", margin: 0 }}>{question.text}</h1>

      <Timer remainingMs={remainingMs} totalMs={timeLimitMs} size={130} />

      <div className="muted" style={{ fontWeight: 600 }}>
        {progress.answeredCount} / {progress.totalPlayers} answered
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          width: "100%",
          maxWidth: 900,
        }}
      >
        {question.options.map((opt, i) => {
          const meta = OPTION_META[i];
          return (
            <div
              key={i}
              style={{
                background: meta.color,
                color: "white",
                borderRadius: 14,
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                fontSize: "1.3rem",
                fontWeight: 700,
                textAlign: "left",
                minHeight: "4.5rem",
              }}
            >
              <Shape shape={meta.shape} size={28} />
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
