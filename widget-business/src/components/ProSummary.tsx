import { Button, Card, Tabs } from "@verify/design-system";
import type { ReactNode } from "react";
import type { AccessibilityReport } from "../api/scanClient";
import { SCORE_POINTS } from "./ScoreGauge";
import { Tag, Badge } from "./Tag";

export type ProView = "issues" | "clean";

/**
 * The reference screenshot's head, exactly: action row, tag row, then a
 * grid of [borderless grey "Issues by severity" card | Tabs]. The tabs
 * are the switch for the full-width findings region below — their panels
 * hold only the summary line, the way the reference draws them. The
 * score lives as the card's first line: the reference card carries the
 * headline numbers, and the score is ours.
 */
export function ProSummary({
  report,
  issueCount,
  cleanCount,
  view,
  onViewChange,
  actions,
  onNewScan,
  onRunScan,
}: {
  report: AccessibilityReport;
  issueCount: number;
  cleanCount: number;
  view: ProView;
  onViewChange: (v: ProView) => void;
  actions?: ReactNode;
  onNewScan?: () => void;
  onRunScan?: () => void;
}) {
  const total = report.summary.total;
  return (
    <>
      <div className="a11y-pro-actions">
        {onRunScan && <Button onClick={onRunScan}>Run scan</Button>}
        {actions}
        {onNewScan && (
          <Button variant="ghost" onClick={onNewScan}>
            New scan
          </Button>
        )}
      </div>
      <div className="a11y-meta-row">
        <Tag tone="gray">Checked against WCAG 2.1 AA</Tag>
        <Tag tone="blue">1 page</Tag>
        {report.summary.critical > 0 && (
          <Tag tone="red">{report.summary.critical} fix first</Tag>
        )}
        <Badge count={total} label={total === 1 ? "finding" : "findings"} />
      </div>

      <div className="a11y-pro-summary">
        {/* Card, with its own title slot — its h3 styling is identical to
            the CSS this replaced. Borderless because the reference draws
            this one as a flat grey block: grey on white is already an
            edge, and a hairline on top of it reads as a second one. */}
        <Card title="Issues by severity" style={{ border: 0 }}>
          <p className="a11y-sum-score">Score {report.score} out of 100</p>
          <p className="a11y-issues-line">
            {total} {total === 1 ? "issue" : "issues"} on 1 page
          </p>
        </Card>
        <Tabs
          // The tabpanel's own content is only a one-line count — the
          // findings/clean-criteria list a tab actually switches lives lower
          // on the page (ProfessionalTable), past a filter-chip row that
          // isn't part of this relationship. aria-owns tells assistive tech
          // the two are still linked, since DOM position can't say so.
          panelOwns="a11y-pro-findings"
          items={[
            {
              id: "issues",
              label: `Issues (${issueCount})`,
              panel: `${issueCount} finding${issueCount === 1 ? "" : "s"}`,
            },
            {
              id: "clean",
              label: `No issues found (${cleanCount})`,
              panel: `${cleanCount} criteria with nothing found`,
            },
          ]}
          defaultId={view}
          onChange={(id: string) => onViewChange(id as ProView)}
        />
      </div>

      <ul className="a11y-score-points">
        {SCORE_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </>
  );
}
