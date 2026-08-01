import React from "react";
export function Card({ title, children, style }) {
  return (
    <section style={{ background: "var(--layer-01)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-sm)", padding: "var(--space-05)", fontFamily: "var(--font-sans)",
      color: "var(--text-primary)", ...style }}>
      {title && <h3 style={{ margin: "0 0 var(--space-04)", fontSize: "var(--type-body-size)", fontWeight: 500 }}>{title}</h3>}
      {children}
    </section>
  );
}
