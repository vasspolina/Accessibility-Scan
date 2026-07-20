import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { LEVEL_FRAMING } from "../lib/wcagPlain";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
  minor: "Minor polish",
};

export function FindingCard({ finding }: { finding: AccessibilityFinding }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `a11y-finding-details-${finding.id}`;
  const hasTechnicalDetails = Boolean(
    finding.selector || finding.elementSnippet || finding.ruleId || finding.wcagCriterion
  );

  return (
    <li className={`a11y-finding a11y-severity-${finding.severity}`}>
      <button
        type="button"
        className="a11y-finding-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        {finding.elementScreenshot && (
          <img
            className="a11y-finding-thumb"
            src={`data:image/jpeg;base64,${finding.elementScreenshot}`}
            alt=""
          />
        )}
        <span className="a11y-severity-badge">{severityLabel[finding.severity]}</span>
        <span className="a11y-finding-desc">{finding.description}</span>
        {finding.wcagLevel && (
          <span className="a11y-level-badge">{LEVEL_FRAMING[finding.wcagLevel]}</span>
        )}
      </button>
      {expanded && (
        <div id={detailsId} className="a11y-finding-details">
          {finding.elementScreenshot && (
            <img
              className="a11y-finding-thumb-large"
              src={`data:image/jpeg;base64,${finding.elementScreenshot}`}
              alt="Screenshot of the affected part of your page"
            />
          )}
          <p>
            <strong>What to do:</strong> {finding.suggestedFix}
          </p>
          {hasTechnicalDetails && (
            <details className="a11y-tech-details">
              <summary>Technical details for your developer</summary>
              {finding.wcagCriterion && finding.wcagCriterion !== "N/A" && (
                <p>
                  <strong>WCAG criterion:</strong> {finding.wcagCriterion}
                </p>
              )}
              {finding.ruleId && (
                <p>
                  <strong>Rule:</strong> <code>{finding.ruleId}</code>
                </p>
              )}
              <p>
                <strong>Element:</strong> <code>{finding.selector}</code>
              </p>
            </details>
          )}
        </div>
      )}
    </li>
  );
}
