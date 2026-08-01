import { OPTION_META, Shape } from "../../optionMeta";
import Timer from "../../components/Timer";

export default function PlayerQuestion({ question, timeLimitMs, remainingMs, selectedIndex, locked, onAnswer }) {
  return (
    <div className="container" style={{ justifyContent: "flex-start", paddingTop: "1.5rem", gap: "1rem" }}>
      <Timer remainingMs={remainingMs} totalMs={timeLimitMs} size={64} />

      {locked ? (
        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Answer locked in!</div>
      ) : (
        <div className="muted">Tap your answer</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          width: "100%",
          maxWidth: 480,
          flex: 1,
        }}
      >
        {question.options.map((opt, i) => {
          const meta = OPTION_META[i];
          const isSelected = selectedIndex === i;
          return (
            <button
              key={i}
              onClick={() => !locked && onAnswer(i)}
              disabled={locked}
              className="btn"
              style={{
                background: meta.color,
                color: "white",
                minHeight: "6.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontSize: "1rem",
                lineHeight: 1.2,
                opacity: locked && !isSelected ? 0.4 : 1,
                outline: isSelected ? "4px solid #1a1a1a" : "none",
                outlineOffset: "-4px",
              }}
            >
              <Shape shape={meta.shape} size={24} />
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
