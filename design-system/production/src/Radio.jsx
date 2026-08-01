import React from "react";
export function Radio({ id, name, value, label, checked, defaultChecked, onChange, disabled = false, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-03)", minHeight: 24, fontFamily: "var(--font-sans)", opacity: disabled ? 0.5 : 1, ...style }}>
      <input type="radio" id={id} name={name} value={value} checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled}
        style={{ width: 20, height: 20, margin: 0, accentColor: "var(--interactive)" }} />
      <label htmlFor={id} style={{ fontSize: "var(--type-body-size)", color: "var(--text-primary)" }}>{label}</label>
    </div>
  );
}
