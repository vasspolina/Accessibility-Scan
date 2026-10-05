import React from "react";
export function IconButton({ label, size = "md", variant = "secondary", disabled = false, onClick, children, style }) {
  const s = { sm: 32, md: 40, lg: 48 }[size] || 40;
  const v = {
    primary: { background: "var(--button-primary)", color: "var(--text-on-color)", border: "1px solid transparent" },
    secondary: { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent" },
  }[variant];
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: s, height: s,
        fontFamily: "var(--font-sans)", fontSize: "var(--type-body-size)", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, ...v, ...style }}>
      {children}
    </button>
  );
}
