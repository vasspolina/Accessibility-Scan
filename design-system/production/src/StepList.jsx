
export function StepList({
  steps = [],
  style
}) {
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-07)",
      fontFamily: "var(--font-sans)",
      color: "var(--text-primary)",
      ...style
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0,1fr)",
      columnGap: "var(--space-05)",
      rowGap: "var(--space-04)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "2.25rem",
      height: "2.25rem",
      borderRadius: "var(--radius-pill)",
      background: "var(--gray-100)",
      color: "var(--white)",
      fontSize: "var(--type-label-size)",
      fontWeight: 500
    }
  }, s.n ?? i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--type-title-size)",
      lineHeight: "var(--type-title-lh-narrow)",
      fontWeight: 500,
      letterSpacing: "var(--tracking-tight)"
    }
  }, s.title), s.lead && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: "var(--space-02)",
      maxWidth: "var(--measure-max)",
      fontSize: "var(--type-body-size)",
      lineHeight: "var(--type-body-lh)",
      color: "var(--text-secondary)"
    }
  }, s.lead), s.children && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-05)"
    }
  }, s.children)))));
}
