import type { AccessibilityFinding } from "../api/scanClient";

/**
 * The severity chip, owned here rather than borrowed from the kit.
 *
 * First of the presentational components to be brought across. It is a good
 * one to start with: no focus behaviour, no ARIA wiring, nothing to lose —
 * the whole component is a coloured word with a glyph in front of it.
 *
 * Two things it keeps deliberately, because both carry meaning rather than
 * decoration:
 *
 * The glyph is aria-hidden. It repeats what the word already says, so a
 * screen reader that read both would announce "exclamation mark, Fix first".
 * It is there for sighted readers, as the second channel this report's own
 * rule demands: severity is never carried by colour alone.
 *
 * The border is currentColor. That is what keeps the chip legible when a
 * theme swaps the fill out from under it — the outline is always the same
 * ink as the text, whatever the background becomes.
 *
 * Styling moves to styles.css rather than staying inline. Inline styles were
 * the kit's way of not depending on a stylesheet it could not see; this
 * package has one, and a class is what lets the phone-width rules reach the
 * chip at all.
 */

type Severity = AccessibilityFinding["severity"] | "pass";

const GLYPH: Record<Severity, string> = {
  critical: "!",
  serious: "!",
  moderate: "!",
  minor: "i",
  pass: "✓",
};

/** The kit's own words, kept as the fallback for callers that pass no label.
 *  Every caller in this package passes one — the report says "Fix first",
 *  not "Critical" — but a component that renders nothing without a prop is
 *  a trap for the next person. */
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
}: {
  severity?: Severity;
  label?: string;
}) {
  return (
    <span className={`a11y-severity-badge a11y-severity-${severity}`}>
      <span aria-hidden="true">{GLYPH[severity] ?? GLYPH.minor}</span>
      {label || WORD[severity] || WORD.minor}
    </span>
  );
}
