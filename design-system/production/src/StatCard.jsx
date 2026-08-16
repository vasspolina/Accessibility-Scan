
export function StatCard({
  label,
  value,
  caption,
  badge,
  badgeTone = "var(--gray-70)",
  tone = "default",
  style
}) {
  const invert = tone === "invert";
  const accent = tone === "accent";
  const fg = invert ? "var(--text-on-invert)" : accent ? "var(--white)" : "var(--text-primary)";
  const muted = invert ? "var(--text-on-invert-tertiary)" : accent ? "rgba(255,255,255,0.8)" : "var(--text-secondary)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: "var(--space-06)",
      minHeight: 200,
      padding: "var(--space-06)",
      borderRadius: "var(--radius-lg)",
      boxSizing: "border-box",
      fontFamily: "var(--font-sans)",
      color: fg,
      background: invert ? "var(--gray-100)" : accent ? "var(--accent-red-fill)" : "var(--layer-01)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-04)",
      minHeight: "1.7em",
      fontSize: "var(--type-label-size)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: muted
    }
  }, label), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      flexShrink: 0,
      whiteSpace: "nowrap",
      padding: "0.15em var(--space-04) 0.25em",
      borderRadius: "var(--radius-pill)",
      background: badgeTone,
      color: "var(--white)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)"
    }
  }, badge)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "clamp(3rem,7vw,4.5rem)",
      lineHeight: 0.82,
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)"
    }
  }, value), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: "var(--space-04)",
      fontSize: "var(--type-title-size)",
      lineHeight: 1.2,
      letterSpacing: "var(--tracking-tight)"
    }
  }, caption)));
}
