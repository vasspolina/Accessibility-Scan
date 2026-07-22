import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { LEVEL_FRAMING, plainForRule } from "../lib/wcagPlain";

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

  // Prefer a plain-English rewrite of this rule (business owners can read it)
  // and keep axe's own developer-facing text only in the technical section.
  const plain = plainForRule(finding.ruleId);
  const headline = plain?.plain ?? finding.description;

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
        <span className="a11y-finding-desc">{headline}</span>
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
          {plain && (
            <p className="a11y-finding-impact">
              <strong>Why this matters:</strong> {plain.impact}
            </p>
          )}
          {finding.suggestedAltText !== undefined && <AltTextSuggestion value={finding.suggestedAltText} />}
          <p>
            <strong>What to do:</strong> {finding.suggestedFix}
          </p>
          {finding.helpUrl && (
            <p>
              <a
                className="a11y-learn-more"
                href={finding.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more about this issue ↗
              </a>
            </p>
          )}
          {hasTechnicalDetails && (
            <details className="a11y-tech-details">
              <summary>Technical details for your developer</summary>
              <p>
                <strong>What the scanner flagged:</strong> {finding.description}
              </p>
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

// Renders the AI's alt-text suggestion for an image missing one. An empty
// value is meaningful — it means the image is decorative and the right fix
// is an empty alt attribute, not a description.
function AltTextSuggestion({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  if (value === "") {
    return (
      <p className="a11y-alt-suggestion a11y-alt-decorative">
        <strong>Suggested alt text:</strong> This image looks decorative, so give it an{" "}
        <em>empty</em> alt text (<code>alt=""</code>) — that tells screen readers to skip it.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (permissions, insecure context) — the text is
      // still shown, owner can select and copy it manually.
    }
  }

  return (
    <div className="a11y-alt-suggestion">
      <p className="a11y-alt-suggestion-label">
        <strong>Suggested alt text</strong> — written from the actual image:
      </p>
      <div className="a11y-alt-suggestion-value">
        <code>{value}</code>
        <button type="button" className="a11y-alt-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
