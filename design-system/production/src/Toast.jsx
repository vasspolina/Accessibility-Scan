import React from "react";
export function Toast({ kind = "info", title, caption, onClose, style }) {
  const fg = { error: "var(--support-error)", success: "var(--support-success)", warning: "var(--severity-moderate)", info: "var(--support-info)" }[kind];
  return (
    <div role="status" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-04)", width: 320,
      padding: "var(--space-04) var(--space-05)", background: "var(--layer-02)", border: "1px solid var(--border-subtle)",
      borderTop: "3px solid " + fg, boxShadow: "var(--shadow-overlay)", fontFamily: "var(--font-sans)", color: "var(--text-primary)", ...style }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--type-body-size)", fontWeight: 500 }}>{title}</div>
        {caption && <div style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)", marginTop: "var(--space-02)" }}>{caption}</div>}
      </div>
      {onClose && <button type="button" aria-label="Dismiss" onClick={onClose}
        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--text-secondary)", width: 24, height: 24, fontSize: 16 }}>×</button>}
    </div>
  );
}
