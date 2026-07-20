import type { AccessibilityReport } from "../api/scanClient";

function scoreColor(score: number): string {
  if (score >= 90) return "var(--a11y-score-good)";
  if (score >= 70) return "var(--a11y-score-warn)";
  return "var(--a11y-score-bad)";
}

function scoreSummary(score: number): string {
  if (score >= 90) return "Your site is in good shape — a few things worth polishing.";
  if (score >= 70) return "Your site works for most people, but has some real gaps to close.";
  return "Your site has significant barriers that are likely turning users away.";
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
