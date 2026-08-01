import React from "react";
export function Badge({ count, label, style }) {
  return (
    <span aria-label={label ? count + " " + label : undefined}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 24, height: 24,
        padding: "0 var(--space-02)", borderRadius: "var(--radius-pill)", background: "var(--gray-100)",
        color: "var(--white)", fontFamily: "var(--font-sans)", fontSize: "var(--type-label-size)", fontWeight: 500, ...style }}>
      {count}
    </span>
  );
}
