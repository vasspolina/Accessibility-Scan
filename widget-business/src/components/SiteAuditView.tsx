import type { SiteAudit } from "../api/scanClient";
import { ConformanceView } from "./ConformanceView";
import { plainForRule } from "../lib/wcagPlain";
import { useReportView } from "./ReportViewContext";
import { SeverityTag } from "./SeverityTag";
import { Tag } from "./Tag";
import { DataTable } from "./DataTable";

const severityLabel = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
} as const;

// The site-level view. Its whole reason to exist is the distinction a
// single-page scan can't draw: problems in the template, which one fix
// resolves everywhere, versus problems on individual pages. So the site-wide
// list leads, and the per-page scores follow.

export function SiteAuditView({ audit }: { audit: SiteAudit }) {
  const worst = audit.worstPage;
  const { professional } = useReportView();

  return (
    <div className="a11y-report">
      <section className="a11y-section a11y-audit-head" aria-labelledby="a11y-audit-head-heading">
        <h2 className="a11y-section-title" id="a11y-audit-head-heading" data-nav-label="Site audit">Site audit</h2>
        <p className="a11y-section-desc">
          {audit.pagesScanned} page{audit.pagesScanned === 1 ? "" : "s"} checked
          {audit.pagesFailed > 0 && `, ${audit.pagesFailed} couldn't be reached`}. We pick the pages
          that matter most: contact, booking and shop before blog posts.
        </p>

        <div className="a11y-conf-tiles">
          <div className="a11y-conf-tile">
            <span className="a11y-conf-num">{audit.averageScore}</span>
            <span className="a11y-conf-cap">
              Average score<em>across {audit.pagesScanned} pages</em>
            </span>
          </div>
          <div className="a11y-conf-tile a11y-conf-tile-fail">
            <span className="a11y-conf-num">{audit.siteWide.length}</span>
            <span className="a11y-conf-cap">
              Site-wide issues<em>one fix each, everywhere</em>
            </span>
          </div>
          {worst && (
            <div className="a11y-conf-tile">
              <span className="a11y-conf-num">{worst.score}</span>
              <span className="a11y-conf-cap">
                Worst page<em>{worst.label}</em>
              </span>
            </div>
          )}
        </div>
      </section>

      {(audit.consistency ?? []).length > 0 && (
        <section className="a11y-section" aria-labelledby="a11y-audit-consistency-heading">
          <h2
            className="a11y-section-title"
            id="a11y-audit-consistency-heading"
            data-nav-label="Pages that disagree"
          >
            Pages that disagree{" "}
            <span className="a11y-section-count">({(audit.consistency ?? []).length})</span>
          </h2>
          <p className="a11y-section-desc">
            Found by comparing your pages against each other, which is the only
            way these show up — one page on its own always looks fine. A menu
            that moves, or a link that changes its name, makes people learn your
            site again on every page.
          </p>
          <ul className="a11y-audit-list">
            {(audit.consistency ?? []).map((issue) => (
              <li key={issue.ruleId} className="a11y-audit-row">
                <span className="a11y-audit-body">
                  <strong>
                    {issue.title}
                    {professional && (
                      <>
                        {" "}
                        <code className="a11y-rule-chip">{issue.criterion}</code>
                      </>
                    )}
                  </strong>
                  <span className="a11y-conf-plain">{issue.description}</span>
                </span>
                <span className="a11y-audit-count">
                  {issue.pages.length}
                  <em>pages</em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {audit.siteWide.length > 0 && (
        <section className="a11y-section a11y-section-redflag" aria-labelledby="a11y-audit-siteWide-heading">
          <h2 className="a11y-section-title" id="a11y-audit-siteWide-heading" data-nav-label="Fix once, fix everywhere">
            Fix once, fix everywhere{" "}
            <span className="a11y-section-count">({audit.siteWide.length})</span>
          </h2>
          <p className="a11y-section-desc">
            These show up on every page, so they live in the template rather than the content —
            structural, not decorative. Start here.
          </p>
          <ul className="a11y-audit-list">
            {audit.siteWide.map((issue) => {
              const plain = plainForRule(issue.ruleId);
              return (
                <li key={issue.ruleId} className={`a11y-audit-row a11y-severity-${issue.severity}`}>
                  <SeverityTag severity={issue.severity} label={severityLabel[issue.severity]} />
                  <span className="a11y-audit-body">
                    <strong>
                      {plain?.plain ?? issue.title}
                      {professional && (
                        <>
                          {" "}
                          <code className="a11y-rule-chip">{issue.ruleId}</code>
                        </>
                      )}
                    </strong>
                    {plain && <span className="a11y-conf-plain">{plain.impact}</span>}
                  </span>
                  <span className="a11y-audit-count">
                    {issue.totalOccurrences}×<em>on all {issue.pageCount} pages</em>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ConformanceView conformance={audit.conformance} showBfsgNote={!professional} />

      <section className="a11y-section" aria-labelledby="a11y-audit-pages-heading">
        <h2 className="a11y-section-title" id="a11y-audit-pages-heading" data-nav-label="Page by page">Page by page</h2>
        <p className="a11y-section-desc">
          Scan a page on its own for the full detail.
        </p>
        {professional ? (
          /* The core.card composition's page table. The status words obey
             the report's honesty line: findings are evidenced failures, so
             "Fails" is earned; their absence is only "No issues found",
             never "Passes". */
          /* Its own class as well as the shared one: this table's columns are
             page/score/issues/status, where the findings tables start with
             an expand arrow, so the position-based rules written for those
             do not describe this one. */
          <div className="a11y-pro-table a11y-pages-table">
            <DataTable
              headers={[
                { key: "page", label: "Page" },
                { key: "score", label: "Score", align: "right", width: "1%" },
                { key: "issues", label: "Issues", align: "right", width: "1%" },
                { key: "status", label: "Status", width: "1%" },
              ]}
              rows={audit.pages.map((page) => ({
                id: page.url,
                cells: [
                  <span key="p">
                    <strong>{page.label}</strong>
                    <span className="a11y-conf-plain">{page.url}</span>
                    {page.error && <span className="a11y-audit-err">{page.error}</span>}
                  </span>,
                  page.error ? "n/a" : page.score,
                  page.error ? "—" : page.findingCount,
                  <Tag
                    key="s"
                    tone={page.error ? "gray" : page.findingCount > 0 ? "red" : "green"}
                  >
                    {page.error
                      ? "Unreachable"
                      : page.findingCount > 0
                        ? "Fails"
                        : "No issues found"}
                  </Tag>,
                ],
              }))}
            />
          </div>
        ) : (
        <ul className="a11y-audit-list">
          {audit.pages.map((page) => (
            <li key={page.url} className="a11y-audit-row">
              <span className={`a11y-audit-score${page.error ? " a11y-audit-score-err" : ""}`}>
                {page.error ? "n/a" : page.score}
              </span>
              <span className="a11y-audit-body">
                <strong>{page.label}</strong>
                <span className="a11y-conf-plain">{page.url}</span>
                {page.error && <span className="a11y-audit-err">{page.error}</span>}
              </span>
              {!page.error && (
                <span className="a11y-audit-count">
                  {page.findingCount}
                  <em>findings</em>
                </span>
              )}
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  );
}
