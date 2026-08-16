
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
export function SiteAudit({
  title = "Pages scanned",
  meta,
  pages = [],
  onSelect,
  style
}) {
  const [hot, setHot] = React.useState(-1);
  const band = s => s >= 90 ? "#198038" : s >= 70 ? "#8e6a00" : "#da1e28";
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
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-secondary)"
    }
  }, meta), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      color: "var(--text-secondary)"
    }
  }, pages.length, " pages")), /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-03)"
    }
  }, pages.map((p, i) => {
    const on = hot === i;
    const inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "1 1 14rem",
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontSize: "var(--type-title-size)",
        lineHeight: "var(--type-title-lh)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        overflowWrap: "anywhere"
      }
    }, p.path), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        marginTop: "var(--space-02)",
        fontSize: "var(--type-label-size)",
        color: on ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
      }
    }, p.title, p.depth != null ? " · depth " + p.depth : "")), p.worst && /*#__PURE__*/React.createElement(__ds_scope.SeverityTag, {
      severity: p.worst,
      onDark: on,
      style: {
        flex: "0 0 auto"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-04)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 72,
        height: 6,
        borderRadius: "var(--radius-pill)",
        background: on ? "rgba(255,255,255,0.24)" : "var(--layer-hover)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        width: p.score + "%",
        height: "100%",
        background: band(p.score)
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: "2.6ch",
        textAlign: "right",
        fontSize: "1.75rem",
        lineHeight: 1,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        fontVariantNumeric: "tabular-nums"
      }
    }, p.score)));
    const rowStyle = {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "var(--space-04) var(--space-05)",
      width: "100%",
      minHeight: "var(--target-min)",
      padding: "var(--space-05)",
      boxSizing: "border-box",
      textAlign: "left",
      border: 0,
      borderRadius: "var(--radius-md)",
      fontFamily: "inherit",
      background: on ? "var(--gray-100)" : "var(--layer-02)",
      color: on ? "var(--text-on-invert)" : "var(--text-primary)",
      transition: "background var(--duration-quick) var(--ease-standard)"
    };
    const bind = {
      onMouseEnter: () => setHot(i),
      onMouseLeave: () => setHot(-1),
      onFocus: () => setHot(i),
      onBlur: () => setHot(-1)
    };
    return /*#__PURE__*/React.createElement("li", {
      key: p.path || i
    }, onSelect ? /*#__PURE__*/React.createElement("button", _extends({
      type: "button"
    }, bind, {
      onClick: () => onSelect(p),
      style: {
        ...rowStyle,
        cursor: "pointer"
      }
    }), inner) : /*#__PURE__*/React.createElement("div", _extends({}, bind, {
      style: rowStyle
    }), inner));
  })));
}
