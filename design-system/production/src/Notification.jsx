import React from "react";
const K = {
  error: { fg: "var(--support-error)", glyph: "!" },
  success: { fg: "var(--support-success)", glyph: "\u2713" },
  warning: { fg: "var(--severity-moderate)", glyph: "!" },
  info: { fg: "var(--support-info)", glyph: "i" },
};
export function Notification({ kind = "info", title, subtitle, onClose, style }) {
  const k = K[kind] || K.info;
  return (
    <div role={kind === "error" ? "alert" : "status"}
      style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-04)", padding: "var(--space-04) var(--space-05)",
        background: "var(--layer-01)", borderLeft: "3px solid " + k.fg, border: "1px solid var(--border-subtle)",
        borderLeftWidth: 3, borderLeftColor: k.fg, fontFamily: "var(--font-sans)", color: "var(--text-primary)", ...style }}>
      <span aria-hidden="true" style={{ color: k.fg, fontWeight: 500, width: 16, textAlign: "center" }}>{k.glyph}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--type-body-size)", fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: "var(--type-body-size)", color: "var(--text-secondary)" }}>{subtitle}</div>}
      </div>
      {onClose && <button type="button" aria-label="Dismiss notification" onClick={onClose}
        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-secondary)", width: 24, height: 24, fontSize: 16 }}>×</button>}
    </div>
  );
}
