import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

export function FindingCard({ finding }: { finding: AccessibilityFinding }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `a11y-finding-details-${finding.id}`;

  return (
    <li className={`a11y-finding a11y-severity-${finding.severity}`}>
      <button
        type="button"
        className="a11y-finding-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        <span className="a11y-severity-badge">{severityLabel[finding.severity]}</span>
        <span className="a11y-finding-desc">{finding.description}</span>
        <span className="a11y-finding-source">
          {finding.source === "ai-review" ? "AI review" : "Automated"}
        </span>
      </button>
      {expanded && (
        <div id={detailsId} className="a11y-finding-details">
          {finding.wcagCriterion && finding.wcagCriterion !== "N/A" && (
            <p>
              <strong>WCAG:</strong> {finding.wcagCriterion}
            </p>
          )}
          <p>
            <strong>Element:</strong> <code>{finding.selector}</code>
          </p>
          <p>
            <strong>Suggested fix:</strong> {finding.suggestedFix}
          </p>
          {finding.confidence && (
            <p>
              <strong>AI confidence:</strong> {finding.confidence}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
