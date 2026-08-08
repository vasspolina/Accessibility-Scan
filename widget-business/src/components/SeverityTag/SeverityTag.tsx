import type { CSSProperties } from "react";
import type { AccessibilityFinding } from "../../api/scanClient";

/**
 * The severity pill, ported from components/scan/SeverityTag.jsx.
 *
 * Presentational only — no focus, no state, no ARIA. The word carries the
 * meaning, so there is nothing here for a screen reader that the text does
 * not already say.
 *
 * The glyph the previous version rendered is gone, and that is the source's
 * decision rather than an omission: a solid fill with the severity written
 * on it already gives a second channel beyond colour, which is what 1.4.1
 * asks for. The glyph was repeating the word, and a screen reader that read
 * both announced "exclamation mark, Fix first".
 *
 * `onDark` switches to the Carbon dark tag pair. It exists because the pill
 * appears on inverted surfaces — IssueRow flips to black on hover, and the
 * five solid fills would otherwise sit on it as bright blocks.
 *
 * SeverityTag.css is not imported here; see src/styles/components.css.
 */

/** "pass" is not a finding severity — nothing is ever reported as passing —
 *  but the conformance tables render a passing row, so the scale carries it
 *  exactly as the source does. */
type Severity = AccessibilityFinding["severity"] | "pass";

/**
 * The source's own words, kept as the fallback when no label is passed.
 * Every call site in this package passes one — the report says "Fix first",
 * not "Critical", because a business reader is being told what to do rather
 * than being graded — but a component that renders nothing without a prop is
 * a trap for the next person.
 */
const WORD: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
  pass: "Pass",
};

export function SeverityTag({
  severity = "minor",
  label,
  onDark = false,
  style,
}: {
  severity?: Severity;
  label?: string;
  onDark?: boolean;
  style?: CSSProperties;
}) {
  /* The source falls back to "minor" for an unknown severity rather than
     rendering an unstyled pill. Kept: a finding with a bad severity value
     should still be readable, and minor is the honest default — it under-
     states rather than over-states. */
  const key: Severity = WORD[severity] ? severity : "minor";

  return (
    <span
      className={`a11y-sev a11y-sev-${key}${onDark ? " a11y-sev-ondark" : ""}`}
      style={style}
    >
      {label || WORD[key]}
    </span>
  );
}
