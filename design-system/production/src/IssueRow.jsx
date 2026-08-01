import React from "react";
import { SeverityTag } from "./SeverityTag.jsx";
export function IssueRow({ severity, title, criterion, count, selector, onClick, style }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "var(--space-05)", width: "100%", minHeight: 48,
        padding: "var(--space-04) var(--space-05)", background: "var(--background)", border: 0,
        borderBottom: "1px solid var(--border-subtle)", textAlign: "left", cursor: "pointer",
        fontFamily: "var(--font-sans)", color: "var(--text-primary)", ...style }}>
      <SeverityTag severity={severity} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "var(--type-body-size)", fontWeight: 500 }}>{title}</span>
        <span style={{ display: "block", fontSize: "var(--type-label-size)", color: "var(--text-secondary)", marginTop: 2 }}>
          {criterion}{selector ? " \u00b7 " + selector : ""}
        </span>
      </span>
      {count != null && <span style={{ flexShrink: 0, fontSize: "var(--type-label-size)", color: "var(--text-secondary)" }}>{count} ×</span>}
    </button>
  );
}
