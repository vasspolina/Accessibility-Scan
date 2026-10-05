import React from "react";
export function Button({ variant = "primary", size = "md", type = "button", disabled = false, onClick, children, style }) {
  const h = { sm: 32, md: 40, lg: 48 }[size] || 40;
  const v = {
    primary: { background: "var(--button-primary)", color: "var(--text-on-color)", border: "1px solid transparent" },
    secondary: { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--link-primary)", border: "1px solid transparent" },
    danger: { background: "var(--button-danger)", color: "var(--text-on-color)", border: "1px solid transparent" },
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-03)",
        height: h, padding: "0 var(--space-05)", fontFamily: "var(--font-sans)", fontSize: "var(--type-body-size)",
        fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast-02) var(--ease-productive-standard)", ...v, ...style }}>
      {children}
    </button>
  );
}
