
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-04)",
      minHeight: "var(--target-min)",
      padding: "0 var(--space-05)",
      borderRadius: "var(--radius-pill)",
      background: "var(--layer-02)",
      border: "var(--border-width) solid var(--border-subtle)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--type-label-size)",
      color: "var(--text-primary)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap"
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "range",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange && onChange(Number(e.target.value)),
    style: {
      flex: "1 1 6rem",
      minWidth: 0,
      accentColor: "var(--accent-red-fill)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: "3.5em",
      textAlign: "right",
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-secondary)"
    }
  }, value, unit));
}
