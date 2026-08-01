import Leaderboard from "../../components/Leaderboard";

const PODIUM_HEIGHTS = { 0: 160, 1: 110, 2: 80 };
const PODIUM_ORDER = [1, 0, 2]; // display order: 2nd, 1st, 3rd

export default function HostFinal({ leaderboard, code, onNewQuiz }) {
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="container" style={{ gap: "1.5rem" }}>
      <h1 style={{ margin: 0 }}>Final Results</h1>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", minHeight: 200 }}>
        {PODIUM_ORDER.filter((i) => podium[i]).map((i) => {
          const entry = podium[i];
          return (
            <div key={entry.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ fontWeight: 700 }}>{entry.name}</div>
              <div className="muted">{entry.score} pts</div>
              <div
                style={{
                  width: 110,
                  height: PODIUM_HEIGHTS[i],
                  background: i === 0 ? "var(--gold)" : "#d9d9d9",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: "0.5rem",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  color: "white",
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <>
          <h2 style={{ marginBottom: 0 }}>Full leaderboard</h2>
          <Leaderboard entries={rest.map((e, idx) => ({ ...e, rankOverride: idx + 4 }))} />
        </>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <a className="btn btn-secondary" href={`/api/rooms/${code}/export.csv`} style={{ textDecoration: "none" }}>
          Export Results (CSV)
        </a>
        <button className="btn btn-primary" onClick={onNewQuiz}>
          New Quiz
        </button>
      </div>
    </div>
  );
}
