
export function ScreenReaderPreview({
  title = "What a screen reader announces",
  source = "Home page",
  voice = "NVDA · Firefox",
  lines = [],
  index,
  onIndexChange,
  style
}) {
  const [i, setI] = React.useState(index != null ? index : 0);
  const cur = index != null ? index : i;
  const set = n => {
    const v = Math.max(0, Math.min(lines.length - 1, n));
    if (onIndexChange) onIndexChange(v);else setI(v);
  };
  const refs = React.useRef([]);
  const pill = {
    minHeight: "var(--target-min)",
    padding: "var(--space-03) var(--space-05)",
    borderRadius: "var(--radius-pill)",
    border: 0,
    background: "rgba(255,255,255,0.14)",
    color: "var(--text-on-invert)",
    fontFamily: "inherit",
    fontSize: "var(--type-label-size)",
    fontWeight: 500,
    cursor: "pointer"
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--gray-100)",
      color: "var(--text-on-invert)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-06)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      gap: "var(--space-04) var(--space-05)",
      fontSize: "var(--type-label-size)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-on-invert-tertiary)"
    }
  }, source, " \xB7 ", voice), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      color: "var(--text-on-invert-tertiary)"
    }
  }, lines.length ? cur + 1 + " of " + lines.length : "")), /*#__PURE__*/React.createElement("ol", {
    "aria-label": "Announcement order",
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-02)",
      maxHeight: 320,
      overflowY: "auto"
    }
  }, lines.map((l, n) => {
    const on = n === cur,
      dim = l.silent;
    return /*#__PURE__*/React.createElement("li", {
      key: n
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      ref: el => refs.current[n] = el,
      onClick: () => set(n),
      "aria-current": on ? "true" : undefined,
      style: {
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "var(--space-03) var(--space-04)",
        minHeight: 44,
        padding: "var(--space-04) var(--space-05)",
        boxSizing: "border-box",
        textAlign: "left",
        cursor: "pointer",
        border: 0,
        borderRadius: "var(--radius-md)",
        fontFamily: "inherit",
        background: on ? "var(--white)" : "transparent",
        color: on ? "var(--gray-100)" : "var(--text-on-invert)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "0 0 auto",
        padding: ".15em var(--space-04) .25em",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--type-label-size)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        background: dim ? "var(--severity-critical, #da1e28)" : on ? "var(--gray-100)" : "rgba(255,255,255,0.16)",
        color: dim ? "#fff" : on ? "var(--white)" : "var(--text-on-invert)"
      }
    }, l.role || "text"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "1 1 12rem",
        minWidth: 0,
        fontSize: "var(--type-title-size)",
        lineHeight: "var(--type-title-lh)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        color: dim ? on ? "var(--severity-critical, #da1e28)" : "var(--text-on-invert-tertiary)" : "inherit"
      }
    }, l.silent ? l.silent : l.text), l.note && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "0 0 auto",
        marginLeft: "auto",
        fontSize: "var(--type-label-size)",
        color: on ? "var(--text-secondary)" : "var(--text-on-invert-tertiary)"
      }
    }, l.note)));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-03)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: pill,
    onClick: () => set(cur - 1),
    disabled: cur === 0
  }, "Previous"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: pill,
    onClick: () => set(cur + 1),
    disabled: cur >= lines.length - 1
  }, "Next"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      alignSelf: "center",
      fontSize: "var(--type-label-size)",
      color: "var(--text-on-invert-tertiary)"
    }
  }, "Reading order, not visual order.")));
}
