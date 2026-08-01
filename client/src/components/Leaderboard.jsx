export default function Leaderboard({ entries, highlightId }) {
  return (
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        width: "100%",
        maxWidth: 480,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.65rem 1rem",
            borderRadius: 10,
            background: entry.id === highlightId ? "#fff6e6" : "#f7f7f7",
            border: entry.id === highlightId ? "2px solid var(--gold)" : "2px solid transparent",
            fontWeight: 600,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <span style={{ color: "var(--text-muted)", width: "1.5rem" }}>{i + 1}</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.name}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            {typeof entry.lastDelta === "number" && entry.lastDelta > 0 && (
              <span style={{ color: "var(--opt-green)", fontSize: "0.85rem" }}>+{entry.lastDelta}</span>
            )}
            <span>{entry.score}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
