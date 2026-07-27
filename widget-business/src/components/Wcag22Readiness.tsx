import { useId, useState } from "react";
import type { Wcag22Readiness as Readiness } from "../api/scanClient";

// The law is going to move, and an owner should see it coming rather than
// discover it. EN 301 549 v3.2.1 adopts WCAG 2.1, which is what the rest of
// this report measures. v4.1.1 adopts WCAG 2.2 and is expected to be cited in
// the Official Journal around October 2026.
//
// Deliberately its own section, below the conformance checklist and visually
// quieter than it. Nothing here is a requirement today, and folding it into
// the checklist would report a site as failing something it is not yet held
// to — the same overclaim this report refuses everywhere else.

const STATUS_LABEL: Record<Readiness["criteria"][number]["status"], string> = {
  "already-failing": "Would fail today",
  "no-issues-found": "Nothing found",
  "needs-review": "Needs a person",
};

export function Wcag22Readiness({ readiness }: { readiness: Readiness }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const { alreadyFailing, needsReview, total, criteria, parsingNoLongerCounts } = readiness;

  return (
    <section className="a11y-section a11y-w22">
      <div className="a11y-accordion-row">
        <h2 className="a11y-section-title a11y-accordion-title">
          <button
            type="button"
            className="a11y-accordion-head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span>
              Ready for the next version?{" "}
              <span className="a11y-section-count">WCAG 2.2, expected {readiness.expectedFrom}</span>
            </span>
            {alreadyFailing > 0 && (
              <span className="a11y-sr-issue-count">
                {alreadyFailing === 1 ? "1 would fail today" : `${alreadyFailing} would fail today`}
              </span>
            )}
            <svg
              className="a11y-accordion-chevron"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 11L3 6l.7-.7L8 9.6l4.3-4.3L13 6z" fill="currentColor" />
            </svg>
          </button>
        </h2>
      </div>

      <p className="a11y-section-desc">
        The standard European law points at is being updated. Nothing here is required yet. These are
        the {total} new items that become Level A or AA when it lands, so you can fix them on your own
        schedule rather than someone else's.
      </p>

      {open && (
        <div id={panelId}>
          <p className="a11y-conf-caveat">
            <strong>What is actually changing.</strong> The European Accessibility Act points at a
            standard called EN 301 549, which today adopts WCAG 2.1. The next version of that
            standard adopts WCAG 2.2 and is expected to be published in the EU's Official Journal in{" "}
            {readiness.expectedFrom}. Until then, the checklist above is the one that counts.
          </p>

          <ul className="a11y-conf-list">
            {criteria.map((c) => (
              <li key={c.id} className={`a11y-conf-row a11y-w22-${c.status}`}>
                <span className="a11y-conf-id">
                  {c.id} <em>{c.level}</em>
                </span>
                <span className="a11y-conf-body">
                  <strong>{c.status === "already-failing" ? c.failing : c.plain}</strong>
                  <span className="a11y-conf-plain">Officially: {c.name}</span>
                  {c.whyManual && <span className="a11y-conf-plain">{c.whyManual}</span>}
                </span>
                <span className="a11y-conf-status">
                  {STATUS_LABEL[c.status]}
                  {c.findingCount > 0 && (
                    <em className="a11y-conf-count">
                      {c.findingCount === 1 ? "1 place" : `${c.findingCount} places`}
                    </em>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="a11y-conf-caveat">
            <strong>Only one of these can be checked by software.</strong> {needsReview} of the{" "}
            {total} depend on things a machine cannot judge: whether a sticky header covers what you
            have tabbed to, whether a drag has a simpler alternative, whether help sits in the same
            place on every page, whether a form asks twice, and whether signing in can be done
            without a puzzle. That is the same honesty as the checklist above, and the same answer:
            these need a person.
          </p>

          {parsingNoLongerCounts && (
            <p className="a11y-notice">
              One piece of good news. This scan reports a failure against 4.1.1 Parsing, and WCAG 2.2
              removes that criterion as obsolete. When the standard updates, that particular failure
              simply stops counting.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
