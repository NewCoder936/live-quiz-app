// Kahoot-standard red/blue/yellow/green, each paired with a distinct shape
// so answers stay distinguishable for colorblind players too.
export const OPTION_META = [
  { letter: "A", color: "var(--opt-red)", shape: "triangle" },
  { letter: "B", color: "var(--opt-blue)", shape: "diamond" },
  { letter: "C", color: "var(--opt-yellow)", shape: "circle" },
  { letter: "D", color: "var(--opt-green)", shape: "square" },
];

export function Shape({ shape, size = 22, color = "white" }) {
  const common = { width: size, height: size, display: "block" };
  switch (shape) {
    case "triangle":
      return (
        <svg viewBox="0 0 24 24" style={common}>
          <polygon points="12,3 22,20 2,20" fill={color} />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 24 24" style={common}>
          <polygon points="12,2 22,12 12,22 2,12" fill={color} />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 24 24" style={common}>
          <circle cx="12" cy="12" r="10" fill={color} />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 24 24" style={common}>
          <rect x="3" y="3" width="18" height="18" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}
