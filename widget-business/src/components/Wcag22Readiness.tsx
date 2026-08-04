import { useId, useState } from "react";
import { DataTable, WhatsNextPanel } from "@verify/design-system";
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
      <h2 className="a11y-section-title" id="a11y-w22-heading" data-nav-label="WCAG 2.2 readiness">
        Ready for the next version?
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
        style={{ marginTop: 12 }}
      />

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
          <p className="a11y-conf-caveat">
            <strong>What actually changes.</strong> The European Accessibility Act points at a
            standard called EN 301 549, which today adopts WCAG 2.1. The next version of that
            standard adopts WCAG 2.2. It is expected in the EU's Official Journal in{" "}
            {readiness.expectedFrom}. Until then, the checklist above is the one that counts.
          </p>

          {/* Moved ahead of the table it explains: most of these rows carry
              no per-row status badge at all (see the comment inside the
              DataTable below), on the reasoning that this paragraph says
              "needs a person" for all of them once — which only holds if a
              reader reaches this sentence before those blank-looking rows,
              not after them. */}
          <p className="a11y-conf-caveat">
            <strong>Software can check only one of these.</strong> {needsReview} of the{" "}
            {total} depend on things a machine cannot judge. Does a sticky header cover what you
            have tabbed to? Does a drag have a simpler alternative? Does help sit in the same
            place on every page? Does a form ask twice? Can you log in without solving a puzzle?
            That is the same honesty as the checklist below, and the same answer:
            these need a person.
          </p>

          {/* The kit's tinted-row table, as the legal-standard section has
              it: result ink + word, never colour alone; the criterion cell
              carries the plain sentence with the official name beneath.
              Status sits under that text rather than in its own column —
              a narrow "Status" column and a long criterion sentence beside
              it left the sentence with no room, crushing it letter by
              letter on a phone. */}
          <DataTable
            caption={`The ${total} new WCAG 2.2 items, checked where software can`}
            headers={[
              { key: "criterion", label: "Criterion" },
              { key: "found", label: "Found", align: "right", width: "90px" },
            ]}
            rows={criteria.map((c) => ({
              id: c.id,
              background:
                c.status === "already-failing"
                  ? "var(--severity-critical-bg, #fff1f1)"
                  : c.status === "no-issues-found"
                    ? "var(--severity-pass-bg, #defbe6)"
                    : "var(--severity-minor-bg, #f4f4f4)",
              cells: [
                <span key="c">
                  <strong>
                    {c.id} ({c.level}) — {c.status === "already-failing" ? c.failing : c.plain}
                  </strong>
                  {/* whyManual answers the plain-language question right
                      above it — without a per-row "Needs a person" badge
                      to close that loop (see below), leaving the jargon
                      name in between broke that question/answer pairing
                      into three disconnected lines. The official name is
                      a footnote now, last, not a wedge between them. */}
                  {c.whyManual && <span className="a11y-conf-plain">{c.whyManual}</span>}
                  <span className="a11y-conf-plain">Officially: {c.name}</span>
                  {/* "Needs a person" is left unstated here on purpose —
                      the caveat paragraph right below this table already
                      says so once, for every row this status covers.
                      Repeating it on each of them added nothing a reader
                      didn't already know from the row above it; the badge
                      only earns its place where it tells you something
                      the caveat doesn't — that this one either already
                      fails or is already clean. */}
                  {c.status !== "needs-review" && (
                    <span
                      className={`a11y-conf-result ${
                        c.status === "already-failing" ? "a11y-conf-result-fail" : "a11y-conf-result-pass"
                      }`}
                    >
                      <span aria-hidden="true">{c.status === "already-failing" ? "!" : "✓"}</span>{" "}
                      {STATUS_LABEL[c.status]}
                    </span>
                  )}
                </span>,
                c.findingCount > 0 ? `${c.findingCount} ×` : "—",
              ],
            }))}
          />

          {parsingNoLongerCounts && (
            <p className="a11y-notice">
              One piece of good news. This scan reports a failure against 4.1.1 Parsing, and WCAG 2.2
              removes that criterion as obsolete. When the standard updates, that particular failure
              simply no longer counts.
            </p>
          )}
      </div>
    </section>
  );
}
