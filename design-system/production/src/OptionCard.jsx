
/* Selection row: rounded-square control (22px box, 2px rule, filled inner square when chosen),
   label and optional description. The native input sits over the box at zero opacity. */
function useRadioState(checked, defaultChecked, onChange) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const [focused, setFocused] = React.useState(false);
  const on = checked === undefined ? inner : checked;
  const handle = e => {
    if (checked === undefined) setInner(true);
    if (onChange) onChange(e);
  };
  return {
    on,
    focused,
    handle,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  };
}
function radioControl(on, focused, onDark, disabled) {
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 22,
      height: 22,
      flexShrink: 0,
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
      border: "2px solid " + (onDark ? "var(--gray-30)" : "var(--gray-60)"),
      background: onDark ? "transparent" : "var(--white)",
      outline: focused ? "2px solid " + (onDark ? "var(--white)" : "var(--focus)") : "none",
      outlineOffset: 2,
      opacity: disabled ? 0.5 : 1
    }
  }, on && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: onDark ? "var(--white)" : "var(--gray-100)"
    }
  }));
}
export function OptionCard({
  id,
  name,
  value,
  label,
  description,
  meta,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  style
}) {
  const s = useRadioState(checked, defaultChecked, onChange);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-04)",
      background: s.on ? "var(--gray-100)" : "var(--layer-01)",
      color: s.on ? "var(--text-on-invert)" : "var(--text-primary)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-05) var(--space-06)",
      boxSizing: "border-box",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      flexShrink: 0,
      marginTop: 2
    }
  }, radioControl(s.on, s.focused, s.on, disabled), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    id: id,
    name: name,
    value: value,
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: s.handle,
    onFocus: s.onFocus,
    onBlur: s.onBlur,
    disabled: disabled,
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      opacity: 0,
      cursor: "inherit"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--type-body-size)",
      fontWeight: 500,
      color: "inherit"
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: "var(--space-02)",
      fontSize: "var(--type-label-size)",
      lineHeight: "var(--type-label-lh-narrow)",
      color: s.on ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
    }
  }, description)), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      fontSize: "var(--type-label-size)",
      color: s.on ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
    }
  }, meta));
}
