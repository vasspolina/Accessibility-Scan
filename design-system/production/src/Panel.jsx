
export function Panel({
  title,
  meta,
  controls,
  tone = "default",
  children,
  style
}) {
  const invert = tone === "invert";
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      boxSizing: "border-box",
      padding: "var(--space-05)",
      borderRadius: "var(--radius-lg)",
      fontFamily: "var(--font-sans)",
      background: invert ? "var(--gray-100)" : "var(--layer-01)",
      color: invert ? "var(--text-on-invert)" : "var(--text-primary)",
      ...style
    }
  }, (title || meta) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-04)",
      fontSize: "var(--type-label-size)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      color: invert ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)"
    }
  }, meta)), controls && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-03)"
    }
  }, controls), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children));
}
