import React from "react";
export function Select({ id, label, options = [], value, defaultValue, onChange, helperText, disabled = false, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-03)", fontFamily: "var(--font-sans)", ...style }}>
      <label htmlFor={id} style={{ fontSize: "var(--type-label-size)", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</label>
      <select id={id} value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled}
        style={{ height: 40, padding: "0 var(--space-04)", background: "var(--field)", color: "var(--text-primary)",
          border: 0, borderBottom: "1px solid var(--border-strong)", fontFamily: "inherit", fontSize: "var(--type-body-size)", opacity: disabled ? 0.5 : 1 }}>
        {options.map((o) => { const v = typeof o === "string" ? { value: o, label: o } : o;
          return <option key={v.value} value={v.value}>{v.label}</option>; })}
      </select>
      {helperText && <span style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)" }}>{helperText}</span>}
    </div>
  );
}
