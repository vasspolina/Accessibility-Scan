import type { AccessibilityReport } from "../api/scanClient";

function scoreColor(score: number): string {
  if (score >= 90) return "var(--a11y-score-good)";
  if (score >= 70) return "var(--a11y-score-warn)";
  return "var(--a11y-score-bad)";
}

function scoreSummary(score: number): string {
  if (score >= 90) return "Solid foundations. A few details left to sand down.";
  if (score >= 70) return "Works for most people. Some doors still don't open.";
  return "Real barriers here. Plenty of people won't get past them.";
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
