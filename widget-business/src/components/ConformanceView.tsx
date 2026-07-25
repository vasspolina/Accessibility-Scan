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

      <div className="a11y-conf-caveat">
        <p>
          <strong>What this tells you.</strong> This check can show that a criterion is failing. It
          cannot show that one is met.
        </p>
        <p>
          That is a limit of any automated check, not of this one in particular.{" "}
          {conformance.needsReview} of the {conformance.total} criteria need a person to judge them.
          Software cannot tell whether your captions are accurate, whether your wording is plain
          enough, or whether someone can extend a form that times out.
        </p>
        <p>
          So <strong>&ldquo;no issues found&rdquo; means we found nothing</strong> — not that you
          have passed.
        </p>
        {conformance.failedByLevel.A > 0 && (
          <p>
            One thing worth knowing: a single Level A failure rules out an AA claim by itself. The
            two levels add up rather than average out, so you need every Level A criterion as well
            as every AA one.
          </p>
        )}
      </div>

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
