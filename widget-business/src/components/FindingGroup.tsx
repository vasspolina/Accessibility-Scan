import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { LEVEL_FRAMING, plainForRule, plainFixForRule } from "../lib/wcagPlain";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
  minor: "Minor polish",
};

// Above this many occurrences of the same issue on one page, the affected-
// element list collapses to the first few plus a "show all" toggle.
const SUMMARY_THRESHOLD = 5;

// A compact, human-readable identifier for one affected element: its actual
// HTML snippet (whitespace-collapsed, truncated) when available, else the
// CSS selector. This is what tells the owner *which* element has the issue.
function elementLabel(finding: AccessibilityFinding): string {
  const snippet = finding.elementSnippet?.replace(/\s+/g, " ").trim();
  if (snippet) return snippet.length > 100 ? `${snippet.slice(0, 100)}…` : snippet;
  return finding.selector;
}

// One titled group = every occurrence of the same issue on the page. The
// shared explanation (why it matters, one clean instruction, learn-more) is
// shown once; below it, the specific elements affected are listed so the
// owner knows exactly what to fix.
export function FindingGroup({ findings }: { findings: AccessibilityFinding[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const rep = findings[0]; // most severe (list is pre-sorted by severity)
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  const title = plain?.plain ?? rep.description;
  const detailsId = `a11y-group-${rep.id}`;

  // One clean instruction for the whole group — a plain rewrite when we have
  // one, otherwise the finding's own (already-plain) suggested fix.
  const whatToDo = plainFixForRule(rep.ruleId) ?? rep.suggestedFix;

  const summarize = count > SUMMARY_THRESHOLD;
  const visibleOccurrences = summarize && !showAll ? findings.slice(0, SUMMARY_THRESHOLD) : findings;

  return (
    <li className={`a11y-finding a11y-severity-${rep.severity}`}>
      <button
        type="button"
        className="a11y-finding-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        {rep.elementScreenshot && (
          <img className="a11y-finding-thumb" src={`data:image/jpeg;base64,${rep.elementScreenshot}`} alt="" />
        )}
        <span className="a11y-severity-badge">{severityLabel[rep.severity]}</span>
        <span className="a11y-finding-desc">{title}</span>
        {count > 1 && <span className="a11y-count-badge">{count}×</span>}
        {rep.wcagLevel && <span className="a11y-level-badge">{LEVEL_FRAMING[rep.wcagLevel]}</span>}
      </button>

      {expanded && (
        <div id={detailsId} className="a11y-finding-details">
          {/* Shared explanation — shown once for the whole group */}
          {plain && (
            <p className="a11y-finding-impact">
              <strong>Why this matters:</strong> {plain.impact}
            </p>
          )}
          <p>
            <strong>What to do:</strong> {whatToDo}
          </p>
          {rep.helpUrl && (
            <p>
              <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                Learn more about this issue ↗
              </a>
            </p>
          )}

          {/* Which specific elements are affected */}
          <div className="a11y-affected">
            <p className="a11y-affected-label">
              <strong>{count > 1 ? `Affected elements (${count}):` : "Affected element:"}</strong>
            </p>
            <ul className="a11y-occurrence-list">
              {visibleOccurrences.map((f) => (
                <Occurrence key={f.id} finding={f} />
              ))}
            </ul>
            {summarize && !showAll && (
              <button type="button" className="a11y-show-all" onClick={() => setShowAll(true)}>
                Show all {count} occurrences
              </button>
            )}
          </div>

          {/* Developer hand-off — the rule reference, shown once */}
          {(rep.ruleId || rep.wcagCriterion) && (
            <details className="a11y-tech-details">
              <summary>Technical details for your developer</summary>
              <p>
                <strong>What the scanner flagged:</strong> {rep.description}
              </p>
              {rep.wcagCriterion && rep.wcagCriterion !== "N/A" && (
                <p>
                  <strong>WCAG criterion:</strong> {rep.wcagCriterion}
                </p>
              )}
              {rep.ruleId && (
                <p>
                  <strong>Rule:</strong> <code>{rep.ruleId}</code>
                </p>
              )}
            </details>
          )}
        </div>
      )}
    </li>
  );
}

// A single affected element: its identifier (HTML snippet or selector), a
// thumbnail when we captured one, and any per-element alt-text suggestion.
function Occurrence({ finding }: { finding: AccessibilityFinding }) {
  const hasAlt = finding.suggestedAltText !== undefined;
  return (
    <li className="a11y-occurrence">
      <div className="a11y-occurrence-head">
        {finding.elementScreenshot && (
          <img className="a11y-occurrence-thumb" src={`data:image/jpeg;base64,${finding.elementScreenshot}`} alt="" />
        )}
        <code className="a11y-occurrence-snippet">{elementLabel(finding)}</code>
      </div>
      {hasAlt && <AltTextSuggestion value={finding.suggestedAltText!} />}
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
        <strong>Suggested alt text:</strong> This image looks decorative, so give it an <em>empty</em>{" "}
        alt text (<code>alt=""</code>) — that tells screen readers to skip it.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the text is still shown to copy manually.
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
