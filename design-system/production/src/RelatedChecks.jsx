
function CheckCard({
  it,
  onOpen
}) {
  const [hot, setHot] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onOpen && onOpen(it),
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    onFocus: () => setHot(true),
    onBlur: () => setHot(false),
    style: {
      background: hot ? "var(--gray-100)" : "var(--layer-01)",
      color: hot ? "var(--text-on-invert)" : "var(--text-primary)",
      borderRadius: "var(--radius-lg)",
      border: 0,
      cursor: "pointer",
      textAlign: "left",
      boxSizing: "border-box",
      padding: "var(--space-06)",
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-03)",
      transition: "background var(--duration-quick) var(--ease-standard)",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      color: hot ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)"
    }
  }, it.id, " \xB7 Level ", it.level), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-title-size)",
      lineHeight: "var(--type-title-lh-narrow)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)"
    }
  }, it.name), it.why && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      lineHeight: "var(--type-label-lh-narrow)",
      color: hot ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
    }
  }, it.why), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: "underline",
      textUnderlineOffset: "3px"
    }
  }, "Open the check \u2197"));
}
export function RelatedChecks({
  title = "Related checks",
  items = [],
  onOpen,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "var(--type-title-size)",
      lineHeight: "var(--type-title-lh)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)",
      color: "var(--text-primary)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
      gap: "var(--space-05)"
    }
  }, items.map(it => /*#__PURE__*/React.createElement(CheckCard, {
    key: it.id,
    it: it,
    onOpen: onOpen
  }))));
}
