import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { LEVEL_FRAMING, plainForRule } from "../lib/wcagPlain";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
  minor: "Minor polish",
};

// Above this many occurrences of the same issue on one page, we stop listing
// each one and show a summary instead — the shared explanation appears once,
// with a thumbnail strip and a count, and the full per-occurrence list is
// tucked behind a "show all" toggle.
const SUMMARY_THRESHOLD = 5;

// One titled group = every occurrence of the same issue on the page. The
// shared explanation (why it matters, what to do, learn-more) is shown once;
// only per-occurrence detail (thumbnail, suggested alt text, selector)
// repeats — and even that collapses to a summary past the threshold.
export function FindingGroup({ findings }: { findings: AccessibilityFinding[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const rep = findings[0]; // most severe (list is pre-sorted by severity)
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  const title = plain?.plain ?? rep.description;
  const detailsId = `a11y-group-${rep.id}`;

  const withThumb = findings.filter((f) => f.elementScreenshot);
  const summarize = count > SUMMARY_THRESHOLD;
  const shownOccurrences = summarize && !showAll ? [] : findings;

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
          {count > 1 && (
            <p className="a11y-group-count">
              Found in <strong>{count} places</strong> on this page.
            </p>
          )}

          {/* Shared explanation — shown once for the whole group */}
          {plain && (
            <p className="a11y-finding-impact">
              <strong>Why this matters:</strong> {plain.impact}
            </p>
          )}
          <p>
            <strong>What to do:</strong> {rep.suggestedFix}
          </p>
          {rep.helpUrl && (
            <p>
              <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                Learn more about this issue ↗
              </a>
            </p>
          )}

          {/* Occurrences: a thumbnail-strip summary past the threshold, else
              the full per-occurrence list. */}
          {summarize && !showAll ? (
            <div className="a11y-occurrence-summary">
              {withThumb.length > 0 && (
                <div className="a11y-thumb-strip">
                  {withThumb.slice(0, 8).map((f) => (
                    <img
                      key={f.id}
                      className="a11y-thumb-strip-item"
                      src={`data:image/jpeg;base64,${f.elementScreenshot}`}
                      alt=""
                    />
                  ))}
                  {withThumb.length > 8 && (
                    <span className="a11y-thumb-more">+{withThumb.length - 8}</span>
                  )}
                </div>
              )}
              <button type="button" className="a11y-show-all" onClick={() => setShowAll(true)}>
                Show all {count} occurrences
              </button>
            </div>
          ) : (
            <ul className="a11y-occurrence-list">
              {shownOccurrences.map((f) => (
                <Occurrence key={f.id} finding={f} showThumb={count > 1} />
              ))}
            </ul>
          )}

          {/* Developer hand-off — the rule and every affected element, once */}
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
            <p>
              <strong>Affected element{count > 1 ? "s" : ""}:</strong>
            </p>
            <ul className="a11y-selector-list">
              {findings.map((f) => (
                <li key={f.id}>
                  <code>{f.selector}</code>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </li>
  );
}

// A single occurrence within a group — thumbnail plus anything unique to it
// (a per-image alt-text suggestion). The shared explanation is not repeated.
function Occurrence({ finding, showThumb }: { finding: AccessibilityFinding; showThumb: boolean }) {
  const hasAlt = finding.suggestedAltText !== undefined;
  if (!finding.elementScreenshot && !hasAlt && !showThumb) return null;
  return (
    <li className="a11y-occurrence">
      {finding.elementScreenshot && (
        <img
          className="a11y-finding-thumb-large"
          src={`data:image/jpeg;base64,${finding.elementScreenshot}`}
          alt="Screenshot of the affected part of your page"
        />
      )}
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
