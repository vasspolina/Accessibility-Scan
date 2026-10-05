import React from "react";
export function Switch({ id, label, checked = false, onChange, disabled = false, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-04)", fontFamily: "var(--font-sans)", opacity: disabled ? 0.5 : 1, ...style }}>
      <span id={id + "-label"} style={{ fontSize: "var(--type-body-size)", color: "var(--text-primary)" }}>{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id + "-label"} id={id} disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        style={{ width: 48, height: 24, padding: 2, border: "1px solid var(--border-strong)", borderRadius: "var(--radius-pill)",
          background: checked ? "var(--interactive)" : "var(--layer-01)", cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background var(--duration-fast-02) var(--ease-productive-standard)" }}>
        <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", background: checked ? "var(--text-on-color)" : "var(--border-strong)" }}></span>
      </button>
      <span aria-hidden="true" style={{ fontSize: "var(--type-label-size)", fontWeight: 500, color: "var(--text-secondary)", minWidth: 24 }}>{checked ? "On" : "Off"}</span>
    </div>
  );
}
