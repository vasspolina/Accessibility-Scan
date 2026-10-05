
export function ShellNav({
  brand = "Accessible Scan",
  context,
  items = [],
  active,
  onSelect,
  footer,
  orientation = "rail",
  tone = "invert",
  style
}) {
  const rail = orientation === "rail";
  const plain = tone === "plain";
  const light = tone === "light" || plain;
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Sections",
    style: {
      display: "flex",
      flexDirection: rail ? "column" : "row",
      alignItems: rail ? "stretch" : "center",
      gap: rail ? "var(--space-06)" : "var(--space-05)",
      width: rail ? 280 : "100%",
      boxSizing: "border-box",
      padding: plain ? 0 : "var(--space-06)",
      background: plain ? "transparent" : light ? "var(--purple-20)" : "var(--gray-100)",
      color: light ? "var(--gray-100)" : "var(--text-on-invert)",
      borderRadius: "var(--radius-lg)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-02)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: light && rail ? "40px" : "var(--type-title-size)",
      lineHeight: 1.2,
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)",
      alignSelf: "flex-start",
      padding: 0,
      background: "transparent"
    }
  }, brand), context && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      color: light ? "var(--text-secondary)" : "var(--text-on-invert-tertiary)"
    }
  }, context)), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      flex: rail ? "1 1 auto" : "0 1 auto",
      display: "flex",
      flexDirection: rail ? "column" : "row",
      flexWrap: "nowrap",
      overflowX: rail ? "visible" : "auto",
      minWidth: 0,
      alignItems: rail ? "stretch" : "flex-start",
      gap: rail ? "var(--space-02)" : "var(--space-03)",
      marginLeft: rail ? 0 : "auto"
    }
  }, items.map((it, i) => {
    const on = (active != null ? active : items[0] && items[0].id) === it.id;
    return /*#__PURE__*/React.createElement("li", {
      key: it.id || i,
      style: { flex: "0 0 auto" }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onSelect && onSelect(it),
      "aria-current": on ? "page" : undefined,
      style: {
        width: rail ? "100%" : "auto",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-04)",
        minHeight: light && rail && !plain ? 36 : "var(--target-min)",
        height: "auto",
        whiteSpace: rail ? "normal" : "nowrap",
        padding: plain ? "var(--space-02) 0" : light && rail ? "var(--space-02) var(--space-05)" : "var(--space-03) var(--space-05)",
        boxSizing: "border-box",
        textAlign: "left",
        cursor: "pointer",
        border: 0,
        borderRadius: "var(--radius-pill)",
        fontFamily: "inherit",
        fontSize: plain ? (rail ? "24px" : "18px") : "var(--type-body-size)",
        fontWeight: plain && !on ? 400 : 500,
        background: plain ? "transparent" : on ? (light ? "var(--gray-100)" : "var(--white)") : light ? "var(--white)" : "transparent",
        color: plain ? (on ? "var(--purple-70)" : "var(--gray-100)") : light ? (on ? "var(--white)" : "var(--gray-100)") : on ? "var(--gray-100)" : "var(--text-on-invert)",
        transition: "background var(--duration-quick) var(--ease-standard)"
      }
    }, it.n != null && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        flex: "0 0 auto",
        fontSize: "var(--type-label-size)",
        color: light ? (on ? "var(--purple-30)" : "var(--purple-70)") : on ? "var(--text-secondary)" : "var(--text-on-invert-tertiary)"
      }
    }, it.n), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, it.label), it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        flex: "0 0 auto",
        padding: ".05em var(--space-03) .15em",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--type-label-size)",
        letterSpacing: "var(--tracking-tight)",
        background: "transparent",
        border: light ? "1px solid currentColor" : 0,
        color: light ? "currentColor" : on ? "var(--gray-100)" : "var(--text-on-invert)"
      }
    }, it.count)));
  })), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      marginLeft: rail ? 0 : "var(--space-05)",
      paddingTop: rail ? "var(--space-05)" : 0,
      borderTop: rail ? (light ? "1px solid var(--purple-30)" : "1px solid rgba(255,255,255,0.16)") : 0,
      fontSize: "var(--type-label-size)",
      color: light ? "var(--text-secondary)" : "var(--text-on-invert-tertiary)"
    }
  }, footer));
}
