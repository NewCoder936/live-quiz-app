export default function PlayerWaiting({ name, code }) {
  return (
    <div className="container">
      <h1>You&apos;re in!</h1>
      <p className="muted">
        Hi {name}, waiting for the host to start the quiz…
      </p>
      <div className="room-code" style={{ fontSize: "1.6rem" }}>
        Room {code}
      </div>
    </div>
  );
}
