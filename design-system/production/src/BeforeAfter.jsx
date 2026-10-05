
export function BeforeAfter({
  beforeLabel = "Before",
  afterLabel = "After",
  note,
  before,
  after,
  layout = "row",
  tone = "plain",
  style
}) {
  const stack = layout === "stack";
  const brand = tone === "brand";
  const cell = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-04)",
    minWidth: 0
  };
  const label = {
    fontSize: "var(--type-label-size)",
    fontWeight: 500,
    letterSpacing: "var(--tracking-tight)"
  };
  const box = brand ? {
    minWidth: 0
  } : {
    padding: "var(--space-05)",
    borderRadius: "var(--radius-md)",
    background: "var(--layer-02)",
    border: "var(--border-width) solid var(--border-subtle)",
    minHeight: 96
  };
  /* The turn marker: a hairline arrow in a pale disc between the two states. */
  const marker = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: brand ? {
      justifySelf: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "var(--layer-01)",
      color: "var(--gray-100)",
      fontSize: 15,
      lineHeight: 1
    } : {
      fontSize: 28,
      color: "var(--gray-60)"
    }
  }, stack ? "\u2193" : "\u2192");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      color: "var(--text-primary)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      ...(brand ? {
        background: "var(--yellow-brand)",
        padding: "var(--space-06)",
        boxSizing: "border-box"
      } : null),
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: stack ? {
      display: "grid",
      gridTemplateRows: "minmax(0,1fr) auto minmax(0,1fr)",
      justifyItems: "center",
      alignItems: "center",
      gap: "var(--space-05)",
      textAlign: "center"
    } : {
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
      alignItems: "center",
      gap: "var(--space-05)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: brand ? { ...cell,
      alignItems: "center",
      color: "var(--gray-70)"
    } : cell
  }, !brand && /*#__PURE__*/React.createElement("span", {
    style: { ...label,
      color: "var(--accent-red-fill)"
    }
  }, beforeLabel), /*#__PURE__*/React.createElement("div", {
    style: box
  }, before)), marker, /*#__PURE__*/React.createElement("div", {
    style: brand ? { ...cell,
      alignItems: "center"
    } : cell
  }, !brand && /*#__PURE__*/React.createElement("span", {
    style: label
  }, afterLabel), /*#__PURE__*/React.createElement("div", {
    style: box
  }, after))), note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: "var(--measure-max)",
      fontSize: "var(--type-body-size)",
      lineHeight: "var(--type-body-lh)",
      color: "var(--text-secondary)"
    }
  }, note));
}
