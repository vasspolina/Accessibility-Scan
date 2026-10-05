
export function Textarea({
  id,
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  helperText,
  invalid = false,
  invalidText,
  disabled = false,
  rows = 5,
  style
}) {
  const help = invalid ? invalidText : helperText;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-03)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      fontSize: "var(--type-label-size)",
      fontWeight: 500,
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("textarea", {
    id: id,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    rows: rows,
    "aria-invalid": invalid || undefined,
    "aria-describedby": help ? id + "-help" : undefined,
    style: {
      padding: "var(--space-05) var(--space-06)",
      background: "var(--layer-01)",
      color: "var(--text-primary)",
      resize: "vertical",
      border: 0,
      outline: "none",
      borderRadius: "var(--radius-lg)",
      boxSizing: "border-box",
      boxShadow: invalid ? "inset 0 0 0 2px var(--support-error)" : "none",
      fontFamily: "inherit",
      fontSize: "var(--type-body-size)",
      lineHeight: "var(--type-body-lh)",
      opacity: disabled ? 0.5 : 1
    }
  }), help && /*#__PURE__*/React.createElement("span", {
    id: id + "-help",
    style: {
      fontSize: "var(--type-label-size)",
      color: invalid ? "var(--support-error)" : "var(--text-secondary)"
    }
  }, help));
}
