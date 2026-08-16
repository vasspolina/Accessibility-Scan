
export function SelectableTile({
  id,
  title,
  meta,
  selected,
  onSelect,
  layout = "row",
  style
}) {
  const row = layout === "row";
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSelect,
    "aria-pressed": !!selected,
    style: {
      display: "flex",
      flexDirection: row ? "row" : "column",
      alignItems: row ? "center" : "flex-start",
      justifyContent: row ? "space-between" : "flex-end",
      gap: "var(--space-04)",
      width: "100%",
      textAlign: "left",
      minHeight: "var(--target-min)",
      padding: "var(--space-04) var(--space-05)",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--type-label-size)",
      border: "var(--border-width) solid " + (selected ? "var(--gray-100)" : "var(--border-subtle)"),
      background: selected ? "var(--gray-100)" : "var(--layer-02)",
      color: selected ? "var(--white)" : "var(--text-primary)",
      ...style
    }
  }, id && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      whiteSpace: "nowrap"
    }
  }, id), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      flex: row ? "1 1 auto" : undefined
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      color: selected ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)"
    }
  }, meta));
}
