import type { AccessibilityReport } from "../api/scanClient";

function scoreColor(score: number): string {
  if (score >= 90) return "var(--a11y-score-good)";
  if (score >= 70) return "var(--a11y-score-warn)";
  return "var(--a11y-score-bad)";
}

function scoreSummary(score: number): string {
  // Three lines that have to work as a family. Each states a judgement and
  // stops. No hedging, no cheerleading, no exclamation of any kind: the number
  // above has already made the point, and a sentence that softens it reads as
  // an apology for the measurement.
  //
  // The middle one carries the argument. "Adequate for most" is exactly the
  // standard a merely-compliant site is aiming at, and the second half says
  // why that is not a compliment.
  if (score >= 90) return "Well built. What remains is craft, not repair.";
  if (score >= 70) return "Adequate for most. Design is judged by the rest.";
  return "This shuts people out. Not deliberately, but by design.";
}

export function ScoreGauge({
  score,
  summary,
}: {
  score: number;
  summary: AccessibilityReport["summary"];
}) {
  return (
    <div className="a11y-score">
      <div className="a11y-score-top">
        <div className="a11y-score-circle" style={{ borderColor: scoreColor(score) }}>
          <span className="a11y-score-number">{score}</span>
          <span className="a11y-score-label">/ 100</span>
        </div>
        <p className="a11y-score-summary">{scoreSummary(score)}</p>
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
    </div>
  );
}
