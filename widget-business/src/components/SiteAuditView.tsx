import type { SiteAudit } from "../api/scanClient";
import { ConformanceView } from "./ConformanceView";
import { plainForRule } from "../lib/wcagPlain";

const severityLabel = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
  minor: "Minor polish",
} as const;

// The site-level view. Its whole reason to exist is the distinction a
// single-page scan can't draw: problems in the template, which one fix
// resolves everywhere, versus problems on individual pages. So the site-wide
// list leads, and the per-page scores follow.

export function SiteAuditView({ audit }: { audit: SiteAudit }) {
  const worst = audit.worstPage;

  return (
    <div className="a11y-report">
      <section className="a11y-section a11y-audit-head">
        <h3 className="a11y-section-title">Site audit</h3>
        <p className="a11y-section-desc">
          {audit.pagesScanned} page{audit.pagesScanned === 1 ? "" : "s"} checked
          {audit.pagesFailed > 0 && `, ${audit.pagesFailed} couldn't be reached`}. We pick the pages
          that matter most: contact, booking and shop before blog posts.
        </p>

        <div className="a11y-conf-tiles">
          <div className="a11y-conf-tile">
            <span className="a11y-conf-num">{audit.averageScore}</span>
            <span className="a11y-conf-cap">
              average score<em>across {audit.pagesScanned} pages</em>
            </span>
          </div>
          <div className="a11y-conf-tile a11y-conf-tile-fail">
            <span className="a11y-conf-num">{audit.siteWide.length}</span>
            <span className="a11y-conf-cap">
              site-wide issues<em>one fix each, everywhere</em>
            </span>
          </div>
          {worst && (
            <div className="a11y-conf-tile">
              <span className="a11y-conf-num">{worst.score}</span>
              <span className="a11y-conf-cap">
                worst page<em>{worst.label}</em>
              </span>
            </div>
          )}
        </div>
      </section>

      {audit.siteWide.length > 0 && (
        <section className="a11y-section a11y-section-redflag">
          <h3 className="a11y-section-title">
            Fix once, fix everywhere{" "}
            <span className="a11y-section-count">({audit.siteWide.length})</span>
          </h3>
          <p className="a11y-section-desc">
            These show up on every page, so they live in the template rather than the content.
            Structural, not decorative. Start here.
          </p>
          <ul className="a11y-audit-list">
            {audit.siteWide.map((issue) => {
              const plain = plainForRule(issue.ruleId);
              return (
                <li key={issue.ruleId} className={`a11y-audit-row a11y-severity-${issue.severity}`}>
                  <span className="a11y-severity-badge">{severityLabel[issue.severity]}</span>
                  <span className="a11y-audit-body">
                    <strong>{plain?.plain ?? issue.title}</strong>
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

      <ConformanceView conformance={audit.conformance} />

      <section className="a11y-section">
        <h3 className="a11y-section-title">Page by page</h3>
        <p className="a11y-section-desc">
          Scan a page on its own for the full detail.
        </p>
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
      </section>
    </div>
  );
}
