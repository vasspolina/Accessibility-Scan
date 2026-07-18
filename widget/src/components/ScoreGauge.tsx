import type { AccessibilityReport } from "../api/scanClient";

function scoreColor(score: number): string {
  if (score >= 90) return "var(--a11y-score-good)";
  if (score >= 70) return "var(--a11y-score-warn)";
  return "var(--a11y-score-bad)";
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
      <div className="a11y-score-circle" style={{ borderColor: scoreColor(score) }}>
        <span className="a11y-score-number">{score}</span>
        <span className="a11y-score-label">/ 100</span>
      </div>
      <dl className="a11y-score-breakdown">
        <div>
          <dt>Critical</dt>
          <dd>{summary.critical}</dd>
        </div>
        <div>
          <dt>Serious</dt>
          <dd>{summary.serious}</dd>
        </div>
        <div>
          <dt>Moderate</dt>
          <dd>{summary.moderate}</dd>
        </div>
        <div>
          <dt>Minor</dt>
          <dd>{summary.minor}</dd>
        </div>
      </dl>
    </div>
  );
}
