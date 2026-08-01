import React from "react";
export function Tooltip({ label, children, style }) {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}
      onKeyDown={(e) => { if (e.key === "Escape") setShow(false); }}>
      {children}
      {show && <span role="tooltip" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translate(-50%, -6px)",
        whiteSpace: "nowrap", padding: "var(--space-02) var(--space-03)", background: "var(--gray-100)", color: "var(--white)",
        fontFamily: "var(--font-sans)", fontSize: "var(--type-label-size)", boxShadow: "var(--shadow-overlay)", zIndex: 10 }}>{label}</span>}
    </span>
  );
}
