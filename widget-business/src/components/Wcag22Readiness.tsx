import { useId, useState } from "react";
import { WhatsNextPanel } from "./WhatsNextPanel";
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
    <section className="a11y-section a11y-w22" aria-labelledby="a11y-w22-heading">
      <h2 className="a11y-section-title" id="a11y-w22-heading" data-nav-label="WCAG 2.2">
        Ready for WCAG 2.2?
      </h2>

      {/* The kit's readiness panel, as redesigned upstream (4 Aug): it now
          carries the "What's next" eyebrow itself, and its own disclosure
          opens the list of the new criteria — so the separate eyebrow span
          this section used to render, and the flattening style override
          from the previous panel shape, are both gone. The technical
          breakdown below stays this component's own toggle: statuses,
          found counts and the caveats are denser detail than the panel's
          item list holds. */}
      <WhatsNextPanel
        standard="WCAG 2.2"
        expected={`expected ${readiness.expectedFrom}`}
        failCount={alreadyFailing}
        description={`The standard European law points at will change. Nothing here is required yet. These are the ${total} new items that become Level A or AA when it lands. You can fix them on your own schedule rather than someone else's.`}
        items={criteria.map((c) => ({ criterion: c.id, title: c.plain, level: c.level }))}
      />

      {/* The design puts everything from here down on a purple panel and
          heads it "The six new items" — the section's own title and intro
          stay on the report's ground above it. A wrapper is the only way
          to draw that: the toggle and the region it controls are siblings
          of the heading, not children of anything. */}
      <div className="a11y-w22-panel">
        <h3 className="a11y-w22-panel-title">The six new items</h3>
        <p className="a11y-w22-panel-lead">
          These need a person, which is the same answer the checklist below
          gives. Nothing here counts against today&rsquo;s score.
        </p>
      <button
        type="button"
        className="a11y-accordion-head a11y-w22-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Hide the technical breakdown" : "Show the technical breakdown"}</span>
        <svg
          className="a11y-accordion-chevron"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M8 11L3 6l.7-.7L8 9.6l4.3-4.3L13 6z" fill="currentColor" />
        </svg>
      </button>

      {/* Hidden rather than unrendered, so aria-controls always points at a
          real element. */}
      <div id={panelId} hidden={!open}>
          <div className="a11y-w22-cols">
          <div>
          <p className="a11y-conf-caveat">
            <strong className="a11y-w22-lead">What actually changes</strong> The European Accessibility Act points at a
            standard called EN 301 549, which today adopts WCAG 2.1. The next version adopts
            WCAG 2.2, expected in the EU's Official Journal in{" "}
            {readiness.expectedFrom}. Until then, the checklist above is the one that counts.
          </p>

          {/* Moved ahead of the table it explains: most of these rows carry
              no per-row status badge at all (see the comment inside the
              DataTable below), on the reasoning that this paragraph says
              "needs a person" for all of them once — which only holds if a
              reader reaches this sentence before those blank-looking rows,
              not after them. */}
          </div>
          <div>
          <p className="a11y-conf-caveat">
            <strong className="a11y-w22-lead">Software can check only one</strong> {needsReview} of the{" "}
            {total} depend on things a machine cannot judge:
          </p>
          {/* These were five questions in a row inside a seventy-six word
              paragraph. They are a list — each one is a separate thing to go
              and look at — and running them together as prose meant a reader
              had to hold all five while working out where each began. */}
          <ul className="a11y-question-list">
            <li>Does a sticky header cover what you have tabbed to?</li>
            <li>Does a drag have a simpler alternative?</li>
            <li>Does help sit in the same place on every page?</li>
            <li>Does a form ask twice?</li>
            <li>Can you log in without solving a puzzle?</li>
          </ul>
          </div>
          </div>
          <p>
            These need a person, which is the same answer the checklist below gives.
          </p>

          {/* The design system's item grid, not a table.
              WhatsNextPanel renders these as cards in an auto-fit grid, with
              `fails` inverting an item to black — and that inversion is the
              point: everything in this section is a FUTURE requirement, so
              the only items allowed any weight are the ones that would fail
              today. The annotation is explicit that presenting future
              criteria as current failures is the anti-pattern.

              This replaces a tinted-row DataTable. The tint said the same
              thing with less force and needed three background colours to do
              it; one inversion says it with one.

              The content is unchanged — plain sentence, the reason a person
              is needed, the official name, the count. The design's own item
              carries less than this, and dropping any of it would be a
              content change wearing a design change's clothes. */}
          <ul className="a11y-next-list" aria-label={`The ${total} new WCAG 2.2 items, checked where software can`}>
            {criteria.map((c) => {
              const fails = c.status === "already-failing";
              return (
                <li key={c.id} className={fails ? "a11y-next-crit-item" : undefined}>
                  <span className="a11y-next-main">
                    <span className="a11y-next-title">
                      {fails ? c.failing : c.plain}
                    </span>
                    <span className="a11y-next-meta">
                      {c.id} · Level {c.level}
                    </span>
                    {c.whyManual && <span className="a11y-next-meta">{c.whyManual}</span>}
                    <span className="a11y-next-meta">Officially: {c.name}</span>
                    {/* Only where it says something the caveat above does
                        not — that this one already fails, or is already
                        clean. "Needs a person" is stated once, up there. */}
                    {c.status !== "needs-review" && (
                      <span className="a11y-next-status">
                        <span aria-hidden="true">{fails ? "!" : "✓"}</span>{" "}
                        {STATUS_LABEL[c.status]}
                      </span>
                    )}
                  </span>
                  {c.findingCount > 0 && (
                    <span className="a11y-next-level">{c.findingCount} ×</span>
                  )}
                </li>
              );
            })}
          </ul>

          {parsingNoLongerCounts && (
            <p className="a11y-notice">
              One piece of good news. This scan reports a failure against 4.1.1 Parsing, and WCAG 2.2
              removes that criterion as obsolete. When the standard updates, that particular failure
              simply no longer counts.
            </p>
          )}
      </div>
      </div>
    </section>
  );
}
