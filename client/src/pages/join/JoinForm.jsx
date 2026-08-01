import { useState } from "react";

export default function JoinForm({ prefillCode, error, onJoin }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode || "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin({ code: code.trim().toUpperCase(), name: name.trim() });
  };

  return (
    <div className="container">
      <div className="brand-bar" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        Nationwide Broker Training Quiz
      </div>
      <h1>Join the Quiz</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", alignItems: "center" }}>
        {!prefillCode && (
          <input
            type="text"
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
        )}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoFocus
        />
        {error && <div className="error-banner">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={!name.trim() || !code.trim()}>
          Join
        </button>
      </form>
    </div>
  );
}
