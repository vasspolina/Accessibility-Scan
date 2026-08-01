import { Badge, Button, Card, ScoreDial, Tag } from "@verify/design-system";
import type { ReactNode } from "react";
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
export function ProSummary({
  report,
  actions,
  onNewScan,
  onRunScan,
}: {
  report: AccessibilityReport;
  /* Rendered into the master file's action row — App passes the print
     button so the print logic stays in one place. */
  actions?: ReactNode;
  onNewScan?: () => void;
  /* The master's leading primary action, doing what it says: re-run the
     scan of this same page. */
  onRunScan?: () => void;
}) {
  const total = report.summary.total;
  return (
    <>
      {/* core.card.html is the layout master: an action row first, then
          the tag row, then a 1fr/1fr card grid, then the full-width
          table further down. Only real actions appear here — the master
          is a specimen sheet, and five button variants with nothing to
          do would be decoration. */}
      <div className="a11y-pro-actions">
        {/* The master's variant order: primary leads, secondary follows,
            ghost last. Each does what its verb says. */}
        {onRunScan && <Button onClick={onRunScan}>Run scan</Button>}
        {actions}
        {onNewScan && (
          <Button variant="ghost" onClick={onNewScan}>
            New scan
          </Button>
        )}
      </div>
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
