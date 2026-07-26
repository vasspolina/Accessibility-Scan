import { useMemo, useState } from "react";
import type { ConformanceSummary, CriterionResult } from "../api/scanClient";

// Answers the question the 0-100 score can't: "are we compliant?"
//
// Deliberately never says yes. A scan can evidence a failure; it cannot
// evidence conformance, because a large share of WCAG can only be judged by a
// person. Every label here is a statement about our evidence, not a verdict on
// the site — which is also the difference between a report a specialist will
// respect and one they'll dismiss.

const STATUS_LABEL = {
  failed: "Failing",
  "no-issues-found": "Nothing found",
  "needs-review": "Needs a person",
} as const;

export function ConformanceView({ conformance }: { conformance: ConformanceSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [onlyFailing, setOnlyFailing] = useState(true);

  const failing = useMemo(
    () => conformance.criteria.filter((c) => c.status === "failed"),
    [conformance.criteria]
  );
  // Every criterion is rendered; the filter hides rather than removes. On
  // screen that is identical. On paper it is the difference between a record
  // of what was checked and a list of what went wrong — a printed compliance
  // document that omits the 22 criteria needing a person is hiding the most
  // honest part of the report. Filtering by not rendering put those rows
  // beyond the reach of the print stylesheet entirely.
  const shown = conformance.criteria;
  const isFilteredOut = (status: CriterionResult["status"]) => onlyFailing && status !== "failed";

  return (
    <section className="a11y-section a11y-conf">
      <h2 className="a11y-section-title">
        Are you meeting the legal standard?{" "}
        <span className="a11y-section-count">{conformance.standard}</span>
      </h2>
      <p className="a11y-section-desc">
        The {conformance.total}-item checklist European accessibility law measures sites against.
      </p>

      <div className="a11y-conf-tiles">
        <div className="a11y-conf-tile a11y-conf-tile-fail">
          <span className="a11y-conf-num">{conformance.failed}</span>
          <span className="a11y-conf-cap">
            <strong>we found problems</strong>
            <em>
              {conformance.failed > 0
                ? `${conformance.failedByLevel.A} at level A, ${conformance.failedByLevel.AA} at AA`
                : "on this page"}
            </em>
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{conformance.noIssuesFound}</span>
          <span className="a11y-conf-cap">
            <strong>we checked, found nothing</strong>
            <em>still worth a human look</em>
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{conformance.needsReview}</span>
          <span className="a11y-conf-cap">
            <strong>we couldn't check</strong>
            <em>only a person can judge these</em>
          </span>
        </div>
      </div>

      <div className="a11y-conf-caveat">
        <p>
          <strong>What this tells you.</strong> What your site gets wrong. Not what it gets
          right.
        </p>
        <p>
          {conformance.needsReview} of the {conformance.total} items need a person. No software can
          judge whether your captions are correct, your wording clear, or your forms fast enough to
          finish. That's true of every automated check.
        </p>
        <p>
          So <strong>&ldquo;nothing found&rdquo; is not a pass.</strong>
        </p>
        {conformance.failedByLevel.A > 0 && (
          <p>
            You need every item at both levels, A and AA. They don't average out. One Level A
            failure means you don't meet the standard.
          </p>
        )}
      </div>

      {/* Always in the DOM, hidden when collapsed. A printed report is
          compliance evidence, and behind a conditional this checklist — the
          substance of it — appeared on paper only if the reader happened to
          expand it first. The print stylesheet can reveal a hidden element;
          it cannot reveal one React never rendered. */}
      <div className="a11y-conf-panel" hidden={!expanded}>
          <div className="a11y-conf-filter">
            <label className="a11y-ai-toggle">
              <input
                type="checkbox"
                checked={onlyFailing}
                onChange={(e) => setOnlyFailing(e.target.checked)}
              />
              Show only what's failing
            </label>
          </div>

          {failing.length === 0 && onlyFailing ? (
            <p className="a11y-conf-caveat">Nothing on this page is failing.</p>
          ) : (
            <ul className="a11y-conf-list">
              {shown.map((c) => (
                <li
                  key={c.id}
                  className={`a11y-conf-row a11y-conf-${c.status}`}
                  hidden={isFilteredOut(c.status)}
                >
                  <span className="a11y-conf-id">
                    {c.id} <em>{c.level}</em>
                  </span>
                  <span className="a11y-conf-body">
                    {/* A failing row states the problem; the rest ask the
                        question, because for those we have no problem to
                        report — only something we didn't find, or couldn't
                        check. */}
                    <strong>{c.status === "failed" ? c.failing : c.plain}</strong>
                    <span className="a11y-conf-plain">
                      Officially: {c.name}
                    </span>
                  </span>
                  <span className="a11y-conf-status">
                    {STATUS_LABEL[c.status]}
                    {/* "(13)" leaves the reader to guess thirteen of what.
                        Say it: thirteen places on this page. */}
                    {c.findingCount > 0 && (
                      <em className="a11y-conf-count">
                        {c.findingCount === 1 ? "1 place" : `${c.findingCount} places`}
                      </em>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="a11y-show-all" onClick={() => setExpanded(false)}>
            Hide the full list
          </button>
      </div>
      {!expanded && (
        <button type="button" className="a11y-show-all" onClick={() => setExpanded(true)}>
          Show all {conformance.total} items
        </button>
      )}
    </section>
  );
}
