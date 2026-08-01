import { Badge, Card, ScoreDial, Tag } from "@verify/design-system";
import type { AccessibilityReport } from "../api/scanClient";
import { SCORE_CAVEAT } from "./ScoreGauge";

const severityRows = [
  ["critical", "Fix first"],
  ["serious", "Fix soon"],
  ["moderate", "Worth fixing"],
  ["minor", "Minor polish"],
] as const;

/**
 * The core.card composition, for the professional report head: a meta tag
 * row (target standard, scope, finding count), then the dial and the
 * "Issues by severity" card side by side — imported Card, Tag, Badge and
 * ScoreDial, our vocabulary inside them. The deadpan summary line stays a
 * business-mode voice; professionals get the facts and the caveat, which
 * is the honesty fixture both audiences share.
 */
export function ProSummary({ report }: { report: AccessibilityReport }) {
  const total = report.summary.total;
  return (
    <>
      <div className="a11y-meta-row">
        {/* The target standard, not an achievement — same honesty as the
            conformance section: what the scan checks against. */}
        <Tag tone="gray">Checked against WCAG 2.1 AA</Tag>
        <Tag tone="blue">1 page</Tag>
        <Badge count={total} label={total === 1 ? "finding" : "findings"} />
      </div>

      <div className="a11y-pro-summary">
        <Card>
          <ScoreDial score={report.score} size={120} />
        </Card>
        <Card title="Issues by severity">
          <dl className="a11y-score-breakdown">
            {severityRows.map(([key, word]) => (
              <div key={key} className={`a11y-severity-${key}`}>
                <dt>
                  <span className="a11y-severity-badge">{word}</span>
                </dt>
                <dd>{report.summary[key]}</dd>
              </div>
            ))}
          </dl>
          <p className="a11y-issues-line">
            {total} {total === 1 ? "issue" : "issues"} on 1 page
          </p>
        </Card>
      </div>

      <p className="a11y-score-caveat">{SCORE_CAVEAT}</p>
    </>
  );
}
