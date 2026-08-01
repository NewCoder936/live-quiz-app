export default function PlayerFinal({ score, rank }) {
  return (
    <div className="container">
      <h1>Quiz complete!</h1>
      <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--gold)" }}>{score} pts</div>
      {rank && (
        <p className="muted" style={{ fontSize: "1.1rem" }}>
          Final rank: <strong>#{rank}</strong>
        </p>
      )}
      <p className="muted">Thanks for playing! Check the shared screen for the full leaderboard.</p>
    </div>
  );
}
