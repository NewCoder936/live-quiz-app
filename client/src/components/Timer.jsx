export default function Timer({ remainingMs, totalMs, size = 110 }) {
  const safeTotal = totalMs > 0 ? totalMs : 1;
  const ratio = Math.max(0, Math.min(1, remainingMs / safeTotal));
  const seconds = Math.ceil(remainingMs / 1000);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const urgent = seconds <= 5;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eee"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "var(--opt-red)" : "var(--gold)"}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.34,
          fontWeight: 800,
          color: urgent ? "var(--opt-red)" : "var(--text)",
        }}
      >
        {seconds}
      </div>
    </div>
  );
}
