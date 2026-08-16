
export function IndexList({
  items = [],
  size = "md",
  onDark = false,
  onSelect,
  style
}) {
  const S = {
    sm: {
      disc: 40,
      title: "var(--type-title-size)"
    },
    md: {
      disc: 56,
      title: "var(--type-heading-size)"
    }
  }[size] || {
    disc: 56,
    title: "var(--type-heading-size)"
  };
  const fg = onDark ? "var(--text-on-invert)" : "var(--text-primary)";
  const muted = onDark ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)";
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-05)",
      fontFamily: "var(--font-sans)",
      color: fg,
      ...style
    }
  }, items.map((it, i) => {
    const inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: S.disc,
        height: S.disc,
        borderRadius: "var(--radius-pill)",
        background: onDark ? "var(--white)" : "var(--gray-100)",
        color: onDark ? "var(--gray-100)" : "var(--white)",
        fontSize: "var(--type-title-size)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)"
      }
    }, it.n || i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontSize: S.title,
        lineHeight: 1.2,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        textWrap: "balance"
      }
    }, it.title), it.sub && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        marginTop: "var(--space-02)",
        fontSize: "var(--type-title-size)",
        lineHeight: 1.2,
        letterSpacing: "var(--tracking-tight)",
        color: muted
      }
    }, it.sub)), it.meta && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        flexShrink: 0,
        fontSize: "var(--type-label-size)",
        color: muted
      }
    }, it.meta));
    const rowStyle = {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-05)",
      width: "100%",
      minHeight: 44,
      padding: 0,
      background: "transparent",
      border: 0,
      textAlign: "left",
      color: "inherit",
      fontFamily: "inherit"
    };
    return /*#__PURE__*/React.createElement("li", {
      key: it.id || i
    }, onSelect ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onSelect(it),
      style: {
        ...rowStyle,
        cursor: "pointer"
      }
    }, inner) : /*#__PURE__*/React.createElement("div", {
      style: rowStyle
    }, inner));
  }));
}
