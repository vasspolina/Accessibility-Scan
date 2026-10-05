
export function Segmented({
  label,
  value,
  options = [],
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    "aria-label": label,
    style: {
      display: "inline-flex",
      gap: 2,
      padding: 2,
      background: "var(--layer-02)",
      border: "var(--border-width) solid var(--border-subtle)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, options.map(o => {
    const v = typeof o === "string" ? o : o.value;
    const t = typeof o === "string" ? o : o.label;
    const on = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(v),
      style: {
        minHeight: "var(--target-min)",
        padding: "0 var(--space-05)",
        borderRadius: "var(--radius-sm)",
        border: 0,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        fontSize: "var(--type-label-size)",
        fontWeight: on ? 500 : 400,
        background: on ? "var(--gray-100)" : "transparent",
        color: on ? "var(--white)" : "var(--text-secondary)"
      }
    }, t);
  }));
}
