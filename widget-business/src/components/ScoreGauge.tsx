import { Card, ScoreDial, SeverityTag } from "@verify/design-system";
import type { CSSProperties } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { groupFindings } from "./FindingsList";
import { plainForRule } from "../lib/wcagPlain";

/* The stat tiles ARE the Card component's anatomy — layer-01 fill, subtle
   hairline, 2px corner, 16px padding — so they use it rather than a div
   whose CSS restated the same inline styles. Card takes no className, so
   the flex layout rides in `style`, which is how the kit's own screens
   compose it. One quiet win: Card reads --layer-01, already bridged and
   scheme-aware, which retires the hardcoded #262626 dark overrides these
   tiles used to need. */
const TILE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 12,
};

const SEVERITY_LABEL: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
};

// How many groups the preview beside the dial shows before the full list
// further down the report takes over. Three matches what a reader can
// scan in the time it takes to look at the dial next to it.
const PREVIEW_LIMIT = 3;

// Each line states a judgement and stops. The number above has already made
// the point, and a sentence that softens it reads as an apology for the
// measurement.
//
// The register is British deadpan: understatement, mock formality, the
// occasional absurd comparison delivered perfectly straight. One rule holds
// across all of it, and it is not negotiable. The joke is always at the
// expense of the design, or of the comfortable assumption behind it. It is
// never at the expense of the people the site turns away, who are the reason
// any of this exists and are not a punchline.
//
// The top band carries a second constraint. A scan reaches perhaps half of
// what is wrong, so "faultless" and "nobody is turned away" were claims this
// tool is not entitled to make on the evidence it has. The good lines say what
// was looked for and found clean, and stop there.
export const SUMMARIES: Record<"good" | "middling" | "poor", string[]> = {
  good: [
    "Well built. What remains is craft, not repair.",
    "Close to right. The rest is finishing, not fixing.",
    "Nothing left that a machine can find. Not the same as nothing left.",
    "A good site. We had a whole speech prepared.",
    "Few doors left closed. A scan cannot see all of them.",
  ],
  middling: [
    "Adequate for most. Design is judged by the rest.",
    "Broadly fine. Broadly is doing a lot of work there.",
    "Mostly accessible, the way a bridge is mostly finished.",
    "Works for most people. The others also have money.",
    "Built for the average visitor. No such person has ever visited.",
  ],
  poor: [
    "This shuts people out. Not deliberately, but by design.",
    "It works perfectly, provided you can see, click and hear.",
    "Barriers throughout. Calling them features would be brave.",
    "Not one problem. A committee of them.",
    "The door is locked. Nobody remembers choosing the lock.",
  ],
};

/**
 * Picks one line for this report.
 *
 * Deterministic on the scan timestamp rather than random, and that matters:
 * Math.random() here would deal a new verdict on every React re-render, so the
 * headline would change each time someone expanded a finding. Keyed this way
 * it is fixed for a given report and different for the next one.
 */
export function scoreSummary(score: number, seed: string): string {
  const band = score >= 90 ? "good" : score >= 70 ? "middling" : "poor";
  const lines = SUMMARIES[band];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(hash) % lines.length];
}

/* The score caveat is a honesty fixture — single-sourced so the business
   card and the professional summary can never drift apart on what the
   number means. */
export const SCORE_CAVEAT =
  "This is what an automated scan found, weighted by how much each problem " +
  "costs a visitor. A scan of this kind reaches somewhere between a third " +
  "and a half of accessibility problems — the rest need a person with a " +
  "keyboard and a screen reader. Useful for telling whether the site is " +
  "improving. Not a statement that it meets the law.";

export function ScoreGauge({
  score,
  seed,
  findings,
}: {
  score: number;
  // The scan timestamp. Fixes which line this report gets, so it stays put
  // across re-renders and changes for the next scan.
  seed: string;
  // The accessibility-category findings, for the preview beside the dial.
  // The full, expandable list further down the report is still the one
  // source of truth — this is a glance at what it holds, not a second
  // copy of it, so it carries no selector and no disclosure of its own.
  findings: AccessibilityFinding[];
}) {
  const preview = groupFindings(findings).slice(0, PREVIEW_LIMIT);
  return (
    <div className="a11y-score">
      {/* The scan-app dashboard's stat row: the dial in its own labelled
          card, then the worst of what it found beside it — the kit's own
          dial-plus-list composition, in place of a row of count tiles that
          repeated the summary line below without saying what any of it
          actually was. */}
      <div className="a11y-stat-row">
        <Card style={{ ...TILE, alignItems: "center" }}>
          <span className="a11y-stat-label">Accessibility score</span>
          <ScoreDial score={score} size={110} />
        </Card>
        <Card style={{ flex: "1 1 320px", minWidth: 0 }}>
          {preview.length === 0 ? (
            <p className="a11y-score-clean">Nothing here needs fixing.</p>
          ) : (
            <ul className="a11y-score-preview">
              {preview.map((group) => {
                const rep = group[0];
                const plain = plainForRule(rep.ruleId);
                const title = plain?.plain ?? rep.title ?? rep.description;
                const criterion =
                  rep.wcagCriterion && rep.wcagCriterion !== "N/A"
                    ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? rep.wcagCriterion)
                    : null;
                return (
                  <li key={rep.id} className="a11y-score-preview-row">
                    <SeverityTag severity={rep.severity} label={SEVERITY_LABEL[rep.severity]} />
                    <span className="a11y-score-preview-desc">
                      {title}
                      {criterion && <span className="a11y-score-preview-meta">WCAG {criterion}</span>}
                    </span>
                    {group.length > 1 && <span className="a11y-count-badge">{group.length}×</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* The kit's callout slot, carrying the line this report has always
          led with. */}
      <p className="a11y-notice a11y-score-callout">{scoreSummary(score, seed)}</p>
      {/* What the number is, next to the number.

          An aggregate score is fine for tracking whether a site is getting
          better and is not a conformance claim, and this one was presented
          without saying so. Automated testing reaches somewhere between a
          third and a half of accessibility problems; the rest needs a person
          with a keyboard and a screen reader. A reader who takes 100 to mean
          "accessible" has been misled by us, not by their own optimism. */}
      <p className="a11y-score-caveat">{SCORE_CAVEAT}</p>
    </div>
  );
}
