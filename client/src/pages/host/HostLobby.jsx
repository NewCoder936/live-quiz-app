import { QRCodeCanvas } from "qrcode.react";

export default function HostLobby({ code, players, totalQuestions, error, onStart }) {
  const joinUrl = `${window.location.origin}/join/${code}`;

  return (
    <div className="container">
      <div className="brand-bar" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        Nationwide Broker Training Quiz
      </div>
      <h1 style={{ margin: 0 }}>Join the Quiz</h1>
      <div className="room-code">{code}</div>
      <p className="muted">Scan the QR code, or go to {window.location.host}/join and enter the code above</p>

      <div style={{ background: "white", padding: "1rem", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <QRCodeCanvas value={joinUrl} size={260} includeMargin fgColor="#1a1a1a" />
      </div>

      <p className="muted">{totalQuestions} questions in this quiz</p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ width: "100%", maxWidth: 640 }}>
        <h2 style={{ marginBottom: "0.5rem" }}>
          Players joined: <strong>{players.length}</strong>
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            justifyContent: "center",
            minHeight: "3rem",
          }}
        >
          {players.length === 0 && <span className="muted">Waiting for players to join…</span>}
          {players.map((p) => (
            <span
              key={p.id}
              style={{
                background: "#f2f2f2",
                borderRadius: 999,
                padding: "0.4rem 1rem",
                fontWeight: 600,
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" disabled={players.length === 0} onClick={onStart}>
        Start Quiz
      </button>
    </div>
  );
}
