
export function FactCard({
  label,
  value,
  note,
  tone = "default",
  children,
  style
}) {
  const accent = tone === "accent",
    invert = tone === "invert";
  const fg = accent ? "#fff" : invert ? "var(--text-on-invert)" : "var(--text-primary)";
  /* The note took --text-on-invert-secondary on BOTH the invert and the accent
     tone. On the dark panel that is 9.9:1 and correct. On --accent-red-fill it
     is 2.91:1 — a caption below AA, in the component whose job is to state a
     fact about accessibility.
     Accent now takes --text-on-invert (4.97:1, the same pairing the label and
     the value already use on this fill). The note is no longer a step softer
     than the label there, which is the cost; the alternative was a caption
     nobody with low vision can read. Invert is unchanged. */
  const muted = accent ? "var(--text-on-invert)" : invert ? "var(--text-on-invert-secondary)" : "var(--text-secondary)";
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: accent ? "var(--accent-red-fill)" : invert ? "var(--text-primary)" : "var(--layer-01)",
      color: fg,
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-06)",
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-04)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      fontWeight: 500,
      color: accent ? "#fff" : fg
    }
  }, label), children, value != null && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 var(--type-display-size-fluid)/0.88 var(--font-sans)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, value)), note && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--type-label-size)",
      lineHeight: "var(--type-label-lh-narrow)",
      color: muted
    }
  }, note));
}
