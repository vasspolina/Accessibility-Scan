import React from "react";

/**
 * Plain-language finding disclosure: the who/what/what-to-do rows, the
 * affected element in a monospace box, and the technical version behind
 * its own collapsible sub-panel. Vendored from the claude.ai/design
 * project (added upstream 4 Aug).
 */
export function FindingDetail({ who, whatFound, whatToDo, affectedLabel = "Affected element:", affected, technicalLabel = "The technical version", technical, defaultTechnicalOpen = false, style }) {
  const [techOpen, setTechOpen] = React.useState(defaultTechnicalOpen);
  const row = (label, value) => (
    <p style={{ margin: 0, fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)", color: "var(--text-secondary)" }}>
      <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>{label}: </strong>{value}
    </p>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-05)", paddingTop: "var(--space-05)", fontFamily: "var(--font-sans)", ...style }}>
      {who && row("Who fixes this", who)}
      {whatFound && row("What we found", whatFound)}
      {whatToDo && row("What to do", whatToDo)}
      {affected && (
        <div>
          <p style={{ margin: "0 0 var(--space-03)", fontSize: "var(--type-body-size)", fontWeight: 700, color: "var(--text-primary)" }}>{affectedLabel}</p>
          <div style={{ background: "var(--layer-01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
            padding: "var(--space-04) var(--space-05)", fontFamily: "monospace", fontSize: "var(--type-body-size)", color: "var(--text-primary)", overflowX: "auto" }}>
            {affected}
          </div>
        </div>
      )}
      {technical && (
        <div style={{ background: "var(--layer-01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
          <button type="button" onClick={() => setTechOpen((o) => !o)} aria-expanded={techOpen}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "var(--space-04)", padding: "var(--space-04) var(--space-05)",
              background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: "var(--type-body-size)", color: "var(--text-primary)" }}>
            <span aria-hidden="true" style={{ display: "inline-block", transition: "transform var(--duration-fast-02) var(--ease-productive-standard)", transform: techOpen ? "rotate(90deg)" : "none" }}>▸</span>
            {technicalLabel}
          </button>
          {techOpen && (
            <div style={{ padding: "0 var(--space-05) var(--space-05) var(--space-11)", fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)", color: "var(--text-secondary)" }}>
              {technical}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
