import React from "react";
export function ProgressBar({ value = 0, max = 100, label, style }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ fontFamily: "var(--font-sans)", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-03)" }}>
        <span style={{ fontSize: "var(--type-label-size)", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)" }} aria-hidden="true">{pct}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
        style={{ height: 8, background: "var(--layer-01)", border: "1px solid var(--border-subtle)" }}>
        <div style={{ width: pct + "%", height: "100%", background: "var(--interactive)",
          transition: "width var(--duration-moderate-01) var(--ease-productive-standard)" }}></div>
      </div>
    </div>
  );
}
