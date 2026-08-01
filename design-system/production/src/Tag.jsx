import React from "react";
export function Tag({ tone = "gray", children, style }) {
  const t = {
    gray: { color: "var(--text-secondary)", background: "var(--layer-01)" },
    blue: { color: "var(--link-primary)", background: "transparent" },
    red: { color: "var(--support-error)", background: "var(--severity-critical-bg)" },
    green: { color: "var(--support-success)", background: "var(--severity-pass-bg)" },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 var(--space-03)",
      borderRadius: "var(--radius-pill)", border: "1px solid currentColor", fontFamily: "var(--font-sans)",
      fontSize: "var(--type-label-size)", fontWeight: 500, ...t, ...style }}>
      {children}
    </span>
  );
}
