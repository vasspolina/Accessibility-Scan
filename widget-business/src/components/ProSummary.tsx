import type { AccessibilityReport, AccessibilityFinding } from "../api/scanClient";
import { SCORE_POINTS } from "./ScoreGauge";
import { Notification } from "./Feedback";

export type ProView = "issues" | "clean";

const SEVERITY_ROWS: { key: AccessibilityFinding["severity"]; label: string }[] = [
  { key: "critical", label: "Critical" },
  { key: "serious", label: "Serious" },
  { key: "moderate", label: "Moderate" },
  { key: "minor", label: "Minor" },
];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * The design's professional scan-results panel: the host and its actions on
 * one bar, the score as an inverted card beside a severity breakdown, and
 * "what the score counts" as numbered cards under it.
 *
 * The tabs that used to live here have moved down beside ProfessionalTable.
 * They switch that table, and the design draws both lists at once rather
 * than as a pair of tabs — keeping them here would have meant a control
 * whose panel is somewhere else on the page, which is exactly why the old
 * version needed aria-owns to explain itself.
 *
 * Every count is read off report.summary, never recounted here: the summary
 * is what the score is computed from, and a second count in the UI is a
 * second chance to disagree with it.
 */
export function ProSummary({
  report,
  issueCount,
  cleanCount,
  onSeeFindings,
}: {
  report: AccessibilityReport;
  issueCount: number;
  cleanCount: number;
  view: ProView;
  onViewChange: (v: ProView) => void;
  onSeeFindings?: () => void;
}) {
  const total = report.summary.total;
  const host = hostnameOf(report.url);
  const clean = (report.conformance?.criteria ?? []).filter(
    (c) => c.status === "no-issues-found"
  );
  const incomplete = report.meta.incompleteChecks ?? [];

  return (
    <section className="a11y-pro-panel" aria-labelledby="a11y-score-heading">
      {/* The host pill and the run controls moved to the shell's top bar,
          which is where the design puts them and where they are reachable
          from every section rather than only from the top of this panel. */}
      <div className="a11y-pro-titlerow">
        <h2 className="a11y-results-title" id="a11y-score-heading" data-nav-label="Score">
          {host} — scan results
        </h2>
        <p className="a11y-pro-count">
          {total} {total === 1 ? "issue" : "issues"} on 1 page
        </p>
      </div>

      <div className="a11y-pro-grid">
        {/* The score card. Inverted, because it is the one figure the whole
            panel is arranged around. */}
        <div className="a11y-pro-scorecard">
          <p className="a11y-pro-eyebrow a11y-pro-eyebrow-invert">Issues by severity</p>
          <p className="a11y-pro-score">
            <span className="a11y-pro-score-num">{report.score}</span>
            <span className="a11y-pro-score-of">out of 100</span>
          </p>
          <div className="a11y-pro-chips">
            <span className="a11y-pro-chip">Checked against WCAG 2.1 AA</span>
            <span className="a11y-pro-chip">1 page</span>
            {report.summary.critical > 0 && (
              <span className="a11y-pro-chip">{report.summary.critical} fix first</span>
            )}
          </div>
          {onSeeFindings && (
            <button type="button" className="a11y-pro-jump" onClick={onSeeFindings}>
              <span>
                See the {issueCount} {issueCount === 1 ? "finding" : "findings"}
              </span>
              <span aria-hidden="true">&#8599;</span>
            </button>
          )}
        </div>

        <div className="a11y-pro-lists">
          <h3 className="a11y-pro-eyebrow" id="a11y-pro-sev-heading">
            Issues ({issueCount})
          </h3>
          <ul className="a11y-pro-rows" aria-labelledby="a11y-pro-sev-heading">
            {SEVERITY_ROWS.map(({ key, label }) => (
              <li key={key} className="a11y-pro-row">
                <span>{label}</span>
                <span className="a11y-pro-row-num">{report.summary[key]}</span>
              </li>
            ))}
          </ul>

          {/* "No issues found", never "Passes": a scan evidences failures, it
              cannot evidence conformance. */}
          <h3 className="a11y-pro-eyebrow" id="a11y-pro-clean-heading">
            No issues found ({cleanCount})
          </h3>
          {clean.length === 0 ? (
            <p className="a11y-pro-empty">
              Nothing here came back clean enough to list.
            </p>
          ) : (
            <ul className="a11y-pro-rows" aria-labelledby="a11y-pro-clean-heading">
              {clean.map((c) => (
                <li key={c.id} className="a11y-pro-row">
                  <span>{c.name}</span>
                  <span className="a11y-pro-row-pass">pass</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="a11y-pro-grid">
        <div>
          <h3 className="a11y-pro-eyebrow" id="a11y-pro-counts-heading">
            What the score counts
          </h3>
          <ol className="a11y-pro-points" aria-labelledby="a11y-pro-counts-heading">
            {SCORE_POINTS.map((point, i) => (
              <li key={point} className="a11y-pro-point">
                <span className="a11y-pro-point-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          {/* The score only counts checks that ran, so a scan where some fell
              over can look better than a complete one. It sits beside the
              points that qualify the score rather than below the whole panel,
              because it is one more qualification of the same number. */}
          {incomplete.length > 0 && (
            <Notification
              kind="warning"
              title={`Some checks didn't finish this time: ${incomplete.join(", ")}.`}
              subtitle="The score above only counts what ran, so it may look better than it should. A second run usually completes them."
            />
          )}
        </div>
      </div>
    </section>
  );
}
