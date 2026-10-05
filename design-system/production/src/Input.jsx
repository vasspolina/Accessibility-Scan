import React from "react";
export function Input({ id, label, type = "text", value, defaultValue, onChange, placeholder, helperText, invalid = false, invalidText, disabled = false, style }) {
  const help = invalid ? invalidText : helperText;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-03)", fontFamily: "var(--font-sans)", ...style }}>
      <label htmlFor={id} style={{ fontSize: "var(--type-label-size)", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</label>
      <input id={id} type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} disabled={disabled}
        aria-invalid={invalid || undefined} aria-describedby={help ? id + "-help" : undefined}
        style={{ height: 40, padding: "0 var(--space-05)", background: "var(--field)", color: "var(--text-primary)",
          border: 0, borderBottom: invalid ? "2px solid var(--support-error)" : "1px solid var(--border-strong)",
          fontFamily: "inherit", fontSize: "var(--type-body-size)", opacity: disabled ? 0.5 : 1 }} />
      {help && <span id={id + "-help"} style={{ fontSize: "var(--type-label-size)", color: invalid ? "var(--support-error)" : "var(--text-secondary)" }}>{help}</span>}
    </div>
  );
}
