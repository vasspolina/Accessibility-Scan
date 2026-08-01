import React from "react";
export function Dialog({ open, title, children, primaryLabel, onPrimary, secondaryLabel = "Cancel", onClose, danger = false, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);
  if (!open) return null;
  return (
    <div onKeyDown={(e) => { if (e.key === "Escape" && onClose) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(22,22,22,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref} tabIndex={-1}
        style={{ width: 420, maxWidth: "90%", background: "var(--layer-02)", border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-overlay)", fontFamily: "var(--font-sans)", color: "var(--text-primary)", ...style }}>
        <h2 id="dlg-title" style={{ margin: 0, padding: "var(--space-05)", fontSize: "var(--type-heading-size)", fontWeight: 500, lineHeight: "var(--type-heading-lh)" }}>{title}</h2>
        <div style={{ padding: "0 var(--space-05) var(--space-05)", fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-03)", padding: "var(--space-04) var(--space-05)", borderTop: "1px solid var(--border-subtle)" }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 var(--space-05)", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)", fontFamily: "inherit", fontSize: "var(--type-body-size)", fontWeight: 500, cursor: "pointer" }}>{secondaryLabel}</button>
          {primaryLabel && <button type="button" onClick={onPrimary} style={{ height: 40, padding: "0 var(--space-05)", background: danger ? "var(--button-danger)" : "var(--button-primary)", color: "var(--text-on-color)", border: 0, fontFamily: "inherit", fontSize: "var(--type-body-size)", fontWeight: 500, cursor: "pointer" }}>{primaryLabel}</button>}
        </div>
      </div>
    </div>
  );
}
