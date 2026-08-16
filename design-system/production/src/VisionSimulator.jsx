
const MODES = [{
  id: "normal",
  label: "Typical vision",
  note: "No filter applied.",
  filter: "none"
}, {
  id: "deuteranopia",
  label: "Deuteranopia",
  note: "Red and green collapse toward each other. About 1 in 16 men.",
  filter: "url(#as-vs-deut)"
}, {
  id: "protanopia",
  label: "Protanopia",
  note: "Reds darken and lose separation from green. About 1 in 100 men.",
  filter: "url(#as-vs-prot)"
}, {
  id: "tritanopia",
  label: "Tritanopia",
  note: "Blue and yellow collapse. Rare, and affects all genders equally.",
  filter: "url(#as-vs-trit)"
}, {
  id: "greyscale",
  label: "No colour",
  note: "What is left when hue carries no meaning at all.",
  filter: "grayscale(1)"
}, {
  id: "lowvision",
  label: "Low acuity",
  note: "Roughly 20/200 uncorrected. Layout survives, small text does not.",
  filter: "blur(2.4px)"
}, {
  id: "cataracts",
  label: "Cataracts",
  note: "Contrast drops and light scatters. Faint grey text is the first thing to go. Common over 60.",
  filter: "blur(1.6px) contrast(0.72) sepia(0.28)"
}];
export const VISION_MODES = MODES;
export function VisionSimulator({
  title = "Vision simulator",
  mode,
  onModeChange,
  modes,
  caption,
  controls = true,
  children,
  style
}) {
  const list = modes ? MODES.filter(m => modes.includes(m.id)) : MODES;
  const [local, setLocal] = React.useState(list[0].id);
  const cur = mode != null ? mode : local;
  const set = id => onModeChange ? onModeChange(id) : setLocal(id);
  const active = list.find(m => m.id === cur) || list[0];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--layer-01)",
      color: "var(--text-primary)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-06)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    focusable: "false",
    style: {
      position: "absolute",
      width: 0,
      height: 0
    }
  }, /*#__PURE__*/React.createElement("filter", {
    id: "as-vs-deut",
    colorInterpolationFilters: "linearRGB"
  }, /*#__PURE__*/React.createElement("feColorMatrix", {
    type: "matrix",
    values: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "as-vs-prot",
    colorInterpolationFilters: "linearRGB"
  }, /*#__PURE__*/React.createElement("feColorMatrix", {
    type: "matrix",
    values: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "as-vs-trit",
    colorInterpolationFilters: "linearRGB"
  }, /*#__PURE__*/React.createElement("feColorMatrix", {
    type: "matrix",
    values: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
  }))), controls && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      gap: "var(--space-04)",
      fontSize: "var(--type-label-size)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, title), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-secondary)"
    }
  }, caption)), controls && /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": "Vision condition",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-03)"
    }
  }, list.map(m => {
    const on = m.id === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      type: "button",
      role: "radio",
      "aria-checked": on,
      onClick: () => set(m.id),
      style: {
        minHeight: "var(--target-min)",
        padding: "var(--space-03) var(--space-05)",
        borderRadius: "var(--radius-pill)",
        border: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "var(--type-label-size)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        background: on ? "var(--gray-100)" : "var(--layer-02)",
        color: on ? "var(--text-on-invert)" : "var(--text-primary)",
        transition: "background var(--duration-quick) var(--ease-standard)"
      }
    }, m.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      background: "var(--layer-02)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      filter: active.filter,
      transition: "filter var(--duration-base) var(--ease-standard)"
    }
  }, children)), controls && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: "var(--measure-max)",
      fontSize: "var(--type-body-size)",
      lineHeight: "var(--type-body-lh)",
      color: "var(--text-secondary)"
    }
  }, active.note));
}
