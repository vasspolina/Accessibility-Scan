import { useMemo, useState } from "react";
import type { ConformanceSummary } from "../api/scanClient";

// Answers the question the 0-100 score can't: "are we compliant?"
//
// Deliberately never says yes. A scan can evidence a failure; it cannot
// evidence conformance, because a large share of WCAG can only be judged by a
// person. Every label here is a statement about our evidence, not a verdict on
// the site — which is also the difference between a report a specialist will
// respect and one they'll dismiss.

const STATUS_LABEL = {
  failed: "Failing",
  "no-issues-found": "No issues found",
  "needs-review": "Needs a human",
} as const;

export function ConformanceView({ conformance }: { conformance: ConformanceSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [onlyFailing, setOnlyFailing] = useState(true);

  const failing = useMemo(
    () => conformance.criteria.filter((c) => c.status === "failed"),
    [conformance.criteria]
  );
  const shown = onlyFailing ? failing : conformance.criteria;

  return (
    <section className="a11y-section a11y-conf">
      <h3 className="a11y-section-title">
        Compliance position{" "}
        <span className="a11y-section-count">({conformance.standard})</span>
      </h3>
      <p className="a11y-section-desc">
        This is the standard EN 301 549 points at, and so what the European Accessibility Act
        effectively requires of a website. Each of the {conformance.total} Level A and AA criteria is
        listed with what this check could establish about it.
      </p>

      <div className="a11y-conf-tiles">
        <div className="a11y-conf-tile a11y-conf-tile-fail">
          <span className="a11y-conf-num">{conformance.failed}</span>
          <span className="a11y-conf-cap">
            failing
            {conformance.failed > 0 && (
              <em>
                {conformance.failedByLevel.A} at Level A, {conformance.failedByLevel.AA} at AA
              </em>
            )}
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{conformance.noIssuesFound}</span>
          <span className="a11y-conf-cap">
            no issues found<em>tested automatically</em>
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{conformance.needsReview}</span>
          <span className="a11y-conf-cap">
            need a person<em>can't be tested by software</em>
          </span>
        </div>
      </div>

      <p className="a11y-conf-caveat">
        <strong>What this can and can't tell you.</strong> A check like this can prove a criterion is
        being <em>failed</em>. It can never prove one is met — {conformance.needsReview} of the{" "}
        {conformance.total} criteria depend on judgement no software can make (are the captions
        accurate? is the language plain enough? can a timed form be extended?). So "no issues found"
        means exactly that, and nothing more.
        {conformance.failedByLevel.A > 0 && (
          <>
            {" "}
            Note that {conformance.failedByLevel.A === 1 ? "a" : "any"} Level A failure rules out an
            AA claim on its own — the levels stack rather than average.
          </>
        )}
      </p>

      {expanded ? (
        <>
          <div className="a11y-conf-filter">
            <label className="a11y-ai-toggle">
              <input
                type="checkbox"
                checked={onlyFailing}
                onChange={(e) => setOnlyFailing(e.target.checked)}
              />
              Show only the failing criteria
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="a11y-conf-caveat">No criteria are failing on this page.</p>
          ) : (
            <ul className="a11y-conf-list">
              {shown.map((c) => (
                <li key={c.id} className={`a11y-conf-row a11y-conf-${c.status}`}>
                  <span className="a11y-conf-id">
                    {c.id} <em>{c.level}</em>
                  </span>
                  <span className="a11y-conf-body">
                    <strong>{c.name}</strong>
                    <span className="a11y-conf-plain">{c.plain}</span>
                  </span>
                  <span className="a11y-conf-status">
                    {STATUS_LABEL[c.status]}
                    {c.findingCount > 0 && ` (${c.findingCount})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="a11y-show-all" onClick={() => setExpanded(false)}>
            Hide the criterion list
          </button>
        </>
      ) : (
        <button type="button" className="a11y-show-all" onClick={() => setExpanded(true)}>
          Show all {conformance.total} criteria
        </button>
      )}
    </section>
  );
}
