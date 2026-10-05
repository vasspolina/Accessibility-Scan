import React from "react";
export function ScoreDial({ score = 0, label = "Accessibility score", size = 120, style }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const tone = score >= 90 ? "var(--severity-pass)" : score >= 70 ? "var(--severity-moderate)" : "var(--severity-critical)";
  const word = score >= 90 ? "Good" : score >= 70 ? "Needs work" : "Failing";
  return (
    <div role="img" aria-label={label + ": " + score + " out of 100 \u2014 " + word}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--space-03)", fontFamily: "var(--font-sans)", ...style }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
            transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "var(--type-heading-size)", fontWeight: 500, color: "var(--text-primary)" }} aria-hidden="true">{score}</div>
      </div>
      <span aria-hidden="true" style={{ fontSize: "var(--type-label-size)", fontWeight: 500, color: tone }}>{word}</span>
    </div>
  );
}
