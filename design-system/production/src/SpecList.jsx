
export function SpecList({
  items = [],
  columns = 1,
  onDark = false,
  style
}) {
  return /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: "grid",
      gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))",
      gap: "var(--space-06) var(--space-07)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.label,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-02)",
      paddingTop: "var(--space-04)",
      borderTop: "1px solid " + (onDark ? "rgba(255,255,255,0.24)" : "var(--border-subtle)")
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      fontSize: "var(--type-label-size)",
      fontWeight: 500,
      color: onDark ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)"
    }
  }, it.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      fontSize: "var(--type-title-size)",
      lineHeight: "var(--type-title-lh-narrow)",
      letterSpacing: "var(--tracking-tight)",
      color: onDark ? "var(--text-on-invert)" : "var(--text-primary)"
    }
  }, it.value), it.note && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      lineHeight: "var(--type-label-lh-narrow)",
      color: onDark ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
    }
  }, it.note))));
}
