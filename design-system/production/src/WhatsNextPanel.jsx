import React from "react";

/**
 * A forward-looking readiness summary: which standard is coming, when, how
 * many items already fail today, and the short list of what changes behind
 * a built-in disclosure. Redesigned upstream (claude.ai/design, 4 Aug):
 * the eyebrow and the expand/collapse now belong to the panel itself, and
 * the "would fail today" count rides on the disclosure button as a pill.
 * Deliberately quieter than SeverityTag/Notification — nothing it reports
 * is a requirement yet, so it never uses the error/warning colour roles.
 */
export function WhatsNextPanel({ eyebrow = "What's next", standard, expected, failCount = 0, description, items = [], defaultOpen = false, style }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section style={{ background: "var(--layer-01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-sans)", color: "var(--text-primary)", overflow: "hidden", ...style }}>
      <div style={{ padding: "var(--space-05) var(--space-05) 0" }}>
        <div style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)", marginBottom: "var(--space-04)" }}>{eyebrow}</div>
      </div>
      <div style={{ padding: "0 var(--space-05) var(--space-05)" }}>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-05)", width: "100%",
            background: "var(--layer-02)", border: "2px solid var(--focus)", borderRadius: "var(--radius-sm)",
            padding: "var(--space-05)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "var(--type-body-size)", fontWeight: 500, color: "var(--text-primary)" }}>{standard} </span>
            <span style={{ fontSize: "var(--type-body-size)", color: "var(--text-secondary)" }}>{expected}</span>
          </span>
          {failCount > 0 && (
            <span style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "var(--space-02) var(--space-04)",
              borderRadius: "var(--radius-pill)", background: "var(--severity-critical-bg)", color: "var(--severity-critical)",
              fontSize: "var(--type-label-size)", fontWeight: 500 }}>
              {failCount} would fail today
            </span>
          )}
          <span aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform var(--duration-fast-02) var(--ease-productive-standard)" }}>⌄</span>
        </button>
        <p style={{ margin: "var(--space-05) 0 0", fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)", color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
      {open && items.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--border-subtle)" }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: "flex", gap: "var(--space-05)", alignItems: "baseline",
              padding: "var(--space-04) var(--space-05)", borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : 0 }}>
              <span style={{ flexShrink: 0, fontSize: "var(--type-label-size)", color: "var(--text-secondary)", minWidth: 64 }}>{it.criterion}</span>
              <span style={{ fontSize: "var(--type-label-size)", color: "var(--text-primary)" }}>{it.title}</span>
              <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "var(--type-label-size)", color: "var(--text-secondary)" }}>{it.level}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
