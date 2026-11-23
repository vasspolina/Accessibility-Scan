import type { AccessibilityReport, AccessibilityFinding } from "../api/scanClient";
import { checkNames, t, tf } from "../lib/strings";
import { statusWord } from "./ManualChecks";
import { Notification } from "./Feedback";
import { OverlayNotes } from "./OverlayNotes";

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
  // A person's decisions, on the rows the scan left open. Listed under
  // their own head rather than folded into "no issues found": the two are
  // different kinds of evidence and the reader is owed the difference.
  const decided = (report.verdicts ?? []).filter((v) => v.status !== "unresolved");
  const nameOf = new Map((report.conformance?.criteria ?? []).map((c) => [c.id, c.name]));

  return (
    <section className="a11y-pro-panel" aria-labelledby="a11y-results-heading">
      {/* The host pill and the run controls moved to the shell's top bar,
          which is where the design puts them and where they are reachable
          from every section rather than only from the top of this panel. */}
      <div className="a11y-pro-titlerow">
        <h2 className="a11y-results-title" id="a11y-results-heading" data-nav-label={t("Results")}>
          {host}: {t("scan results")}
        </h2>
        <p className="a11y-pro-count">
          {total === 1 ? t("1 issue on 1 page") : tf("{count} issues on 1 page", { count: total })}
        </p>
      </div>

      <div className="a11y-pro-grid">
        {/* The score card (the number, three chips and a jump to the
            findings) is gone: the professional report opens on the same
            "Your score" block as the owner's, the dial and the run of the
            worst findings, drawn by ScoreGauge above this panel (user's
            instruction, 23 Nov 2026, "bring old design back", "this one"). */}
        <div className="a11y-pro-lists">
          <h3 className="a11y-pro-eyebrow" id="a11y-pro-sev-heading">
            {tf("Issues ({count})", { count: issueCount })}
          </h3>
          <ul className="a11y-pro-rows" aria-labelledby="a11y-pro-sev-heading">
            {SEVERITY_ROWS.map(({ key, label }) => (
              <li key={key} className="a11y-pro-row">
                <span>{t(label)}</span>
                <span className="a11y-pro-row-num">{report.summary[key]}</span>
              </li>
            ))}
          </ul>

          {/* "No issues found", never "Passes": a scan evidences failures, it
              cannot evidence conformance. */}
          <h3 className="a11y-pro-eyebrow" id="a11y-pro-clean-heading">
            {tf("No issues found ({count})", { count: cleanCount })}
          </h3>
          {clean.length === 0 ? (
            <p className="a11y-pro-empty">
              {t("No check came back clean on this page.")}
            </p>
          ) : (
            <ul className="a11y-pro-rows" aria-labelledby="a11y-pro-clean-heading">
              {clean.map((c) => (
                <li key={c.id} className="a11y-pro-row">
                  <span>{c.name}</span>
                  {/* Never "pass": a scan evidences failure, not conformance —
                      the module's own rule, which this literal broke. */}
                  <span className="a11y-pro-row-pass">{t("Nothing found")}</span>
                </li>
              ))}
            </ul>
          )}

          {decided.length > 0 && (
            <>
              <h3 className="a11y-pro-eyebrow" id="a11y-pro-decided-heading">
                {t("Checked by a person")} ({decided.length})
              </h3>
              <ul className="a11y-pro-rows" aria-labelledby="a11y-pro-decided-heading">
                {decided.map((v) => (
                  <li key={v.criterion} className="a11y-pro-row">
                    <span>
                      {v.criterion} {nameOf.get(v.criterion) ?? ""}
                    </span>
                    <span className="a11y-pro-row-pass">{statusWord(v.status)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="a11y-pro-grid">
        {/* "What the score counts" is in the score block above, once. */}
        <div>
          {/* The score only counts checks that ran, so a scan where some fell
              over can look better than a complete one. It sits beside the
              points that qualify the score rather than below the whole panel,
              because it is one more qualification of the same number. */}
          {incomplete.length > 0 && (
            <Notification
              kind="warning"
              title={tf("Some checks didn't finish: {checks}.", { checks: checkNames(incomplete) })}
              subtitle={t("The score counts only what ran, so it may be too high. Run the scan again.")}
            />
          )}
          {/* What the score was measured with: an overlay on the page is one
              more qualification of the same number. */}
          <OverlayNotes overlays={report.meta.overlays} />
        </div>
      </div>
    </section>
  );
}
