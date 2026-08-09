import type { ReactNode } from "react";

/**
 * FixPreviews, ported from ui_kits/scan-app/FixPreviews.jsx. Tokens rewritten
 * per .claude/rules/kit-token-map.md.
 *
 * ---- The before/after samples are illustrations, not content --------------
 *
 * Every "before" in this screen is deliberately wrong: faint grey text for the
 * contrast card, letterspaced capitals, a 26px target, alt="". That is the
 * point — the card shows you the failure next to the fix.
 *
 * The kit renders them as ordinary text, which has two consequences it does
 * not address. A screen reader reads "Aa Aa", "BEYOND BEYOND", "click here
 * read the 2026 report" — the comparison is entirely visual, so aloud it is
 * just doubled noise. And an audit of this page reports real contrast failures
 * on text that is failing on purpose, which in THIS product is worse than
 * cosmetic: it makes the tool's own report untrustworthy.
 *
 * So the samples are aria-hidden and each card carries a `summary` that says
 * in words what the picture shows. Same information, once, in a form that
 * works either way. The design's own VisionSimulator annotation makes the same
 * distinction — it demonstrates a failure to a stakeholder; the pass/fail
 * decision comes from measured contrast, not from the demonstration.
 *
 */

export type FixTone = "purple" | "magenta" | "blue" | "teal" | "cyan" | "green";

export function FixCard({
  label,
  tone = "purple",
  summary,
  before,
  after,
}: {
  label: string;
  tone?: FixTone;
  /** What the picture shows, in words. Required — see the note above. */
  summary: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <section
      className="a11y-fixcard"
      aria-label={`${label}. ${summary}`}
    >
      <span className={`a11y-fixcard-tag a11y-fixcard-tone-${tone}`}>{label}</span>
      <div className="a11y-fixcard-stage" aria-hidden="true">
        <span className="a11y-fixcard-before">{before}</span>
        <span className="a11y-fixcard-arrow">→</span>
        <span className="a11y-fixcard-after">{after}</span>
      </div>
    </section>
  );
}

export function FixPreviews({
  title = "What each fix looks like",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="a11y-fixpreviews">
      <h2 className="a11y-fixpreviews-title">{title}</h2>
      <div className="a11y-fixpreviews-grid">{children}</div>
    </div>
  );
}
