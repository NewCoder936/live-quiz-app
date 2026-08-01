export default function PlayerReveal({ result }) {
  if (!result) {
    return (
      <div className="container">
        <p className="muted">Waiting for results…</p>
      </div>
    );
  }

  const { correct, points, score, rank, totalPlayers } = result;

  return (
    <div className="container">
      <h1 style={{ color: correct ? "var(--opt-green)" : "var(--opt-red)", margin: 0 }}>
        {correct ? "Correct!" : "Incorrect"}
      </h1>
      {correct && <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>+{points} points</p>}
      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        <div>
          <div className="muted">Rank</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>
            {rank} / {totalPlayers}
          </div>
        </div>
        <div>
          <div className="muted">Total score</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--gold)" }}>{score}</div>
        </div>
      </div>
      <p className="muted">Waiting for the host to continue…</p>
    </div>
  );
}
