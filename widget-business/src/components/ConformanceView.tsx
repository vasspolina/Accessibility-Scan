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
  const shown = onlyFailing ? failing : conformance.criteria;

  return (
    <section className="a11y-section a11y-conf">
      <h3 className="a11y-section-title">
        Are you meeting the legal standard?{" "}
        <span className="a11y-section-count">{conformance.standard}</span>
      </h3>
      <p className="a11y-section-desc">
        The {conformance.total}-item checklist European accessibility law measures sites against.
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
            nothing found<em>we could check these</em>
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{conformance.needsReview}</span>
          <span className="a11y-conf-cap">
            need a person<em>software can't judge these</em>
          </span>
        </div>
      </div>

      <div className="a11y-conf-caveat">
        <p>
          <strong>What this tells you.</strong> What your site gets wrong — not that the rest is
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
            You need every item at both levels, A and AA. They don't average out — one Level A
            failure means you don't meet the standard.
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
              Show only what's failing
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="a11y-conf-caveat">Nothing on this page is failing.</p>
          ) : (
            <ul className="a11y-conf-list">
              {shown.map((c) => (
                <li key={c.id} className={`a11y-conf-row a11y-conf-${c.status}`}>
                  <span className="a11y-conf-id">
                    {c.id} <em>{c.level}</em>
                  </span>
                  <span className="a11y-conf-body">
                    <strong>{c.plain}</strong>
                    <span className="a11y-conf-plain">
                      {c.name} — the official name for this one
                    </span>
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
            Hide the full list
          </button>
        </>
      ) : (
        <button type="button" className="a11y-show-all" onClick={() => setExpanded(true)}>
          Show all {conformance.total} items
        </button>
      )}
    </section>
  );
}
