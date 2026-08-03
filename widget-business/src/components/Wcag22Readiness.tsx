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
      <span className="a11y-section-eyebrow">What's next</span>
      <h2 className="a11y-section-title" id="a11y-w22-heading" data-nav-label="WCAG 2.2 readiness">
        Ready for the next version?
      </h2>

      {/* The kit's own readiness summary — standard, expected date, how many
          already fail, and the plain-language line underneath. Everything
          past this (the per-criterion status, found counts, "needs a
          person" caveat, the parsing note) stays in the disclosure below:
          denser detail than the panel's own shape holds. */}
      <WhatsNextPanel
        standard={`WCAG 2.2, expected ${readiness.expectedFrom}`}
        failCount={alreadyFailing}
        description={`The standard European law points at will change. Nothing here is required yet. These are the ${total} new items that become Level A or AA when it lands, so you can fix them on your own schedule rather than someone else's.`}
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
            standard adopts WCAG 2.2 and is expected to be published in the EU's Official Journal in{" "}
            {readiness.expectedFrom}. Until then, the checklist above is the one that counts.
          </p>

          {/* The kit's tinted-row table, as the legal-standard section has
              it: result ink + word, never colour alone; the criterion cell
              carries the plain sentence with the official name beneath. */}
          <DataTable
            caption={`The ${total} new WCAG 2.2 items, checked where software can`}
            headers={[
              { key: "criterion", label: "Criterion" },
              { key: "status", label: "Status", width: "1%" },
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
                  <span className="a11y-conf-plain">Officially: {c.name}</span>
                  {c.whyManual && <span className="a11y-conf-plain">{c.whyManual}</span>}
                </span>,
                <span
                  key="s"
                  className={`a11y-conf-result ${
                    c.status === "already-failing"
                      ? "a11y-conf-result-fail"
                      : c.status === "no-issues-found"
                        ? "a11y-conf-result-pass"
                        : "a11y-conf-result-minor"
                  }`}
                >
                  <span aria-hidden="true">
                    {c.status === "already-failing" ? "!" : c.status === "no-issues-found" ? "✓" : "i"}
                  </span>{" "}
                  {STATUS_LABEL[c.status]}
                </span>,
                c.findingCount > 0 ? `${c.findingCount} ×` : "—",
              ],
            }))}
          />

          <p className="a11y-conf-caveat">
            <strong>Only one of these can be checked by software.</strong> {needsReview} of the{" "}
            {total} depend on things a machine cannot judge: whether a sticky header covers what you
            have tabbed to, whether a drag has a simpler alternative, whether help sits in the same
            place on every page, whether a form asks twice, and whether a login can be done
            without a puzzle. That is the same honesty as the checklist above, and the same answer:
            these need a person.
          </p>

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
