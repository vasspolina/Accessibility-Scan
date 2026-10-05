import React from "react";
const S = {
  critical: { word: "Critical", glyph: "!", fg: "var(--severity-critical)", bg: "var(--severity-critical-bg)" },
  serious: { word: "Serious", glyph: "!", fg: "var(--severity-serious)", bg: "var(--severity-serious-bg)" },
  moderate: { word: "Moderate", glyph: "!", fg: "var(--severity-moderate)", bg: "var(--severity-moderate-bg)" },
  minor: { word: "Minor", glyph: "i", fg: "var(--severity-minor)", bg: "var(--severity-minor-bg)" },
  pass: { word: "Pass", glyph: "✓", fg: "var(--severity-pass)", bg: "var(--severity-pass-bg)" },
};
export function SeverityTag({ severity = "minor", label, style }) {
  const s = S[severity] || S.minor;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-02)", height: 24, whiteSpace: "nowrap",
      padding: "0 var(--space-03)", borderRadius: "var(--radius-pill)", background: s.bg, color: s.fg,
      border: "1px solid currentColor", fontFamily: "var(--font-sans)", fontSize: "var(--type-label-size)", fontWeight: 500, ...style }}>
      <span aria-hidden="true">{s.glyph}</span>{label || s.word}
    </span>
  );
}
