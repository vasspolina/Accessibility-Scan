
export function SectionHead({
  index,
  title,
  lead,
  meta,
  statement,
  body,
  actionLabel,
  onAction,
  variant = "stack",
  onDark = false,
  sticky = false,
  style
}) {
  const inv = onDark;
  const muted = inv ? "var(--text-on-invert-tertiary)" : "var(--text-secondary)";
  const fg = inv ? "var(--text-on-invert)" : "var(--text-primary)";
  if (variant === "band") {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        boxSizing: "border-box",
        padding: "var(--space-06)",
        borderRadius: "var(--radius-lg)",
        background: inv ? "var(--gray-100)" : "var(--layer-01)",
        color: fg,
        fontFamily: "var(--font-sans)",
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        columnGap: "var(--space-06)",
        rowGap: "var(--space-04)",
        fontSize: "var(--type-label-size)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-03)",
        flexWrap: "wrap"
      }
    }, index && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        color: muted
      }
    }, index), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)"
      }
    }, title), meta), lead && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "1 1 12rem",
        minWidth: 0,
        color: muted
      }
    }, lead), actionLabel && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onAction,
      style: {
        flex: "0 0 auto",
        marginLeft: "auto",
        whiteSpace: "nowrap",
        minHeight: "var(--target-min)",
        padding: "var(--space-03) var(--space-05)",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        border: inv ? 0 : "1px solid var(--text-primary)",
        background: inv ? "var(--white)" : "transparent",
        color: inv ? "var(--gray-100)" : "var(--text-primary)",
        fontFamily: "inherit",
        fontSize: "var(--type-label-size)"
      }
    }, actionLabel)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: body ? "repeat(auto-fit,minmax(min(100%,20rem),1fr))" : "1fr",
        gap: "var(--space-06)",
        marginTop: "var(--space-07)",
        alignItems: "start"
      }
    }, (statement || title) && /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: "clamp(2.25rem,5.5vw,4.5rem)",
        lineHeight: 0.94,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        textWrap: "balance"
      }
    }, statement || title), body && /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--measure-max)",
        fontSize: "var(--type-body-size)",
        lineHeight: "var(--type-body-lh)",
        color: inv ? "var(--text-on-invert-secondary)" : "var(--text-secondary)"
      }
    }, body)));
  }
  if (variant === "page") {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,22rem),1fr))",
        alignItems: "start",
        gap: "var(--space-06)",
        fontFamily: "var(--font-sans)",
        color: fg,
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontSize: "clamp(2.5rem,6.5vw,5.5rem)",
        lineHeight: 0.96,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        textWrap: "balance"
      }
    }, title), lead && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "var(--space-06) 0 0",
        maxWidth: "var(--measure)",
        fontSize: "var(--type-body-lg)",
        lineHeight: 1.2,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        textIndent: "2.5em",
        textWrap: "pretty"
      }
    }, lead)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "var(--space-05)",
        textAlign: "right",
        fontSize: "var(--type-label-size)"
      }
    }, index && /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, index), meta && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        gap: "var(--space-03)"
      }
    }, meta), actionLabel && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onAction,
      style: {
        marginTop: "var(--space-05)",
        padding: 0,
        minHeight: "var(--target-min)",
        border: 0,
        background: "transparent",
        color: "var(--accent-red-fill)",
        fontFamily: "inherit",
        fontSize: "var(--type-label-size)",
        fontWeight: 500,
        cursor: "pointer"
      }
    }, actionLabel)));
  }
  if (variant === "tile") {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        position: "relative",
        marginTop: meta ? 12 : 0,
        fontFamily: "var(--font-sans)",
        ...style
      }
    }, meta && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -12,
        right: "var(--space-05)",
        zIndex: 1
      }
    }, meta), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-07)",
        minHeight: 420,
        boxSizing: "border-box",
        padding: "var(--space-06)",
        borderRadius: "var(--radius-lg)",
        background: inv ? "var(--gray-100)" : "var(--layer-01)",
        color: fg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-02)"
      }
    }, index && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        fontSize: "var(--type-label-size)",
        color: muted
      }
    }, index), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--type-title-size)",
        lineHeight: "var(--type-title-lh)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)"
      }
    }, title), lead && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--type-label-size)",
        lineHeight: 1.2,
        color: muted
      }
    }, lead)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        alignItems: "flex-end"
      }
    }, (statement || title) && /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: "clamp(1.75rem,3vw,2.75rem)",
        lineHeight: 1.2,
        fontWeight: 500,
        letterSpacing: "var(--tracking-tight)",
        textWrap: "balance"
      }
    }, statement || title)), actionLabel && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onAction,
      style: {
        width: "100%",
        minHeight: 48,
        padding: "var(--space-04) var(--space-06)",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        border: inv ? 0 : "1px solid var(--text-primary)",
        background: inv ? "var(--white)" : "transparent",
        color: inv ? "var(--gray-100)" : "var(--text-primary)",
        fontFamily: "inherit",
        fontSize: "var(--type-body-size)",
        fontWeight: 500
      }
    }, actionLabel)));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "var(--space-04)",
      paddingTop: "var(--space-04)",
      borderTop: "1px solid " + (inv ? "var(--text-on-invert-tertiary)" : "var(--text-primary)"),
      fontFamily: "var(--font-sans)",
      color: fg,
      position: sticky ? "sticky" : undefined,
      top: sticky ? "var(--space-06)" : undefined,
      alignSelf: "start",
      ...style
    }
  }, index && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: "var(--type-label-size)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)",
      color: muted
    }
  }, index), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--type-heading-size)",
      lineHeight: "var(--type-heading-lh)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)",
      textWrap: "balance"
    }
  }, title), lead && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: "var(--measure-max)",
      lineHeight: "var(--type-body-lh-medium)",
      color: muted
    }
  }, lead), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-03)",
      flexWrap: "wrap",
      width: "fit-content",
      maxWidth: "100%",
      alignSelf: "flex-start",
      marginTop: "var(--space-02)"
    }
  }, meta));
}
