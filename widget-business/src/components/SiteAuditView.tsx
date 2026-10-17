import type { SiteAudit } from "../api/scanClient";
import { t, tf } from "../lib/strings";
import { ConformanceView } from "./ConformanceView";
import { plainForRule } from "../lib/wcagPlain";
import { getLang } from "../lib/i18n";
import { useReportView } from "./ReportViewContext";
import { SeverityTag } from "./SeverityTag";
import { Tag } from "./Tag";
import { DataTable } from "./DataTable";
import { failureText } from "../lib/failureText";

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

// The opening count, one whole sentence per case: German and the rest agree
// the verb with both numbers, so neither "page(s)" nor the clause about
// unreachable pages can be bolted on afterwards.
function checkedSentence(scanned: number, failed: number): string {
  const values = { count: scanned, failed };
  if (failed === 0) {
    return scanned === 1 ? t("1 page checked.") : tf("{count} pages checked.", values);
  }
  if (failed === 1) {
    return scanned === 1
      ? t("1 page checked, 1 couldn't be reached.")
      : tf("{count} pages checked, 1 couldn't be reached.", values);
  }
  return scanned === 1
    ? tf("1 page checked, {failed} couldn't be reached.", values)
    : tf("{count} pages checked, {failed} couldn't be reached.", values);
}

export function SiteAuditView({ audit }: { audit: SiteAudit }) {
  const worst = audit.worstPage;
  const { professional } = useReportView();

  return (
    <div className="a11y-report">
      <section className="a11y-section a11y-audit-head" aria-labelledby="a11y-audit-head-heading">
        <h2 className="a11y-section-title" id="a11y-audit-head-heading" data-nav-label={t("Site audit")}>{t("Site audit")}</h2>
        <p className="a11y-section-desc">
          {checkedSentence(audit.pagesScanned, audit.pagesFailed)}{" "}
          {t("We pick the pages that matter most: contact, booking and shop before blog posts.")}
        </p>

        <div className="a11y-conf-tiles">
          <div className="a11y-conf-tile">
            <span className="a11y-conf-num">{audit.averageScore}</span>
            <span className="a11y-conf-cap">
              {t("Average score")}
              <em>
                {audit.pagesScanned === 1
                  ? t("across 1 page")
                  : tf("across {count} pages", { count: audit.pagesScanned })}
              </em>
            </span>
          </div>
          <div className="a11y-conf-tile a11y-conf-tile-fail">
            <span className="a11y-conf-num">{audit.siteWide.length}</span>
            <span className="a11y-conf-cap">
              {t("Site-wide issues")}<em>{t("one fix each, everywhere")}</em>
            </span>
          </div>
          {worst && (
            <div className="a11y-conf-tile">
              <span className="a11y-conf-num">{worst.score}</span>
              <span className="a11y-conf-cap">
                {t("Worst page")}<em>{worst.label}</em>
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
            data-nav-label={t("Pages that disagree")}
          >
            {t("Pages that disagree")}{" "}
            <span className="a11y-section-count">({(audit.consistency ?? []).length})</span>
          </h2>
          <p className="a11y-section-desc">
            {t(
              "Found by comparing your pages against each other, which is the only way these show up."
            )}
          </p>
          <ul className="a11y-audit-list">
            {(audit.consistency ?? []).map((issue) => {
              // The backend writes these in English, naming the pages and
              // links involved. In another language the rule's own entry
              // says it instead, counted from the number the backend sends;
              // English keeps the backend's more specific wording.
              const plain = getLang() !== "en" ? plainForRule(issue.ruleId) : undefined;
              const title = plain?.plain ?? issue.title;
              const what = plain?.found ? plain.found(issue.count ?? 1) : issue.description;
              return (
              <li key={issue.ruleId} className="a11y-audit-row">
                <span className="a11y-audit-body">
                  <strong>
                    {title}
                    {professional && (
                      <>
                        {" "}
                        <code className="a11y-rule-chip">{issue.criterion}</code>
                      </>
                    )}
                  </strong>
                  <span className="a11y-conf-plain">{what}</span>
                </span>
                <span className="a11y-audit-count">
                  {issue.pages.length}
                  <em>{t("pages")}</em>
                </span>
              </li>
              );
            })}
          </ul>
        </section>
      )}

      {audit.siteWide.length > 0 && (
        <section className="a11y-section a11y-section-concern" aria-labelledby="a11y-audit-siteWide-heading">
          <h2 className="a11y-section-title" id="a11y-audit-siteWide-heading" data-nav-label={t("Fix once, fix everywhere")}>
            {t("Fix once, fix everywhere")}{" "}
            <span className="a11y-section-count">({audit.siteWide.length})</span>
          </h2>
          <p className="a11y-section-desc">
            {t("These show up on every page, so they live in the template rather than the content. Start here.")}
          </p>
          <ul className="a11y-audit-list">
            {audit.siteWide.map((issue) => {
              const plain = plainForRule(issue.ruleId);
              return (
                <li key={issue.ruleId} className={`a11y-audit-row a11y-severity-${issue.severity}`}>
                  <SeverityTag severity={issue.severity} label={t(severityLabel[issue.severity])} />
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
                    {/* pageCount is never 1: the backend only calls an issue
                        site-wide once two or more pages were scanned. */}
                    {issue.totalOccurrences}×<em>{tf("on all {count} pages", { count: issue.pageCount })}</em>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ConformanceView conformance={audit.conformance} showBfsgNote={!professional} />

      <section className="a11y-section" aria-labelledby="a11y-audit-pages-heading">
        <h2 className="a11y-section-title" id="a11y-audit-pages-heading" data-nav-label={t("Page by page")}>{t("Page by page")}</h2>
        <p className="a11y-section-desc">
          {t("Scan a page on its own for the full detail.")}
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
                { key: "page", label: t("Page") },
                { key: "score", label: t("Score"), align: "right" },
                { key: "issues", label: t("Issues"), align: "right" },
                { key: "status", label: t("Status") },
              ]}
              rows={audit.pages.map((page) => ({
                id: page.url,
                cells: [
                  <span key="p">
                    <strong>{page.label}</strong>
                    <span className="a11y-conf-plain">{page.url}</span>
                    {page.error && <span className="a11y-audit-err">{failureText(page.error, page.errorReason)}</span>}
                  </span>,
                  page.error ? t("n/a") : page.score,
                  page.error ? t("n/a") : page.findingCount,
                  <Tag
                    key="s"
                    tone={page.error ? "gray" : page.findingCount > 0 ? "red" : "green"}
                  >
                    {page.error
                      ? t("Unreachable")
                      : page.findingCount > 0
                        ? t("Fails")
                        : t("No issues found")}
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
                {page.error ? t("n/a") : page.score}
              </span>
              <span className="a11y-audit-body">
                <strong>{page.label}</strong>
                <span className="a11y-conf-plain">{page.url}</span>
                {page.error && <span className="a11y-audit-err">{failureText(page.error, page.errorReason)}</span>}
              </span>
              {!page.error && (
                <span className="a11y-audit-count">
                  {page.findingCount}
                  <em>{page.findingCount === 1 ? t("finding") : t("findings")}</em>
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
