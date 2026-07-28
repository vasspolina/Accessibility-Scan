import type { AccessibilityReport } from "../api/scanClient";

function scoreColor(score: number): string {
  if (score >= 90) return "var(--a11y-score-good)";
  if (score >= 70) return "var(--a11y-score-warn)";
  return "var(--a11y-score-bad)";
}

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

export function ScoreGauge({
  score,
  summary,
  seed,
}: {
  score: number;
  summary: AccessibilityReport["summary"];
  // The scan timestamp. Fixes which line this report gets, so it stays put
  // across re-renders and changes for the next scan.
  seed: string;
}) {
  return (
    <div className="a11y-score">
      <div className="a11y-score-top">
        <div className="a11y-score-circle" style={{ borderColor: scoreColor(score) }}>
          <span className="a11y-score-number">{score}</span>
          <span className="a11y-score-label">/ 100</span>
        </div>
        <p className="a11y-score-summary">{scoreSummary(score, seed)}</p>
      </div>
      <dl className="a11y-score-breakdown">
        <div>
          <dt>Fix first</dt>
          <dd>{summary.critical}</dd>
        </div>
        <div>
          <dt>Fix soon</dt>
          <dd>{summary.serious}</dd>
        </div>
        <div>
          <dt>Worth fixing</dt>
          <dd>{summary.moderate}</dd>
        </div>
        <div>
          <dt>Minor polish</dt>
          <dd>{summary.minor}</dd>
        </div>
      </dl>
      {/* What the number is, next to the number.

          An aggregate score is fine for tracking whether a site is getting
          better and is not a conformance claim, and this one was presented
          without saying so. Automated testing reaches somewhere between a
          third and a half of accessibility problems; the rest needs a person
          with a keyboard and a screen reader. A reader who takes 100 to mean
          "accessible" has been misled by us, not by their own optimism. */}
      <p className="a11y-score-caveat">
        This is what an automated scan found, weighted by how much each problem
        costs a visitor. A scan of this kind reaches somewhere between a third
        and a half of accessibility problems — the rest need a person with a
        keyboard and a screen reader. Useful for telling whether the site is
        improving. Not a statement that it meets the law.
      </p>
    </div>
  );
}
