import { useState } from "react";
import { t, tf } from "../lib/strings";
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
  "not-measured": "Not measured",
};

export function Wcag22Readiness({ readiness }: { readiness: Readiness }) {
  const { total, criteria, parsingNoLongerCounts } = readiness;
  // The backend writes the date in English ("late 2026"). Looked up like the
  // backend's check names: a date with no translation stays as it came.
  const expectedFrom = t(readiness.expectedFrom);
  /* Each item is a caret row like a finding (user's instruction, 24 Nov
     2026, "align properly and make a carret"): the question and its call
     on one line, the criterion (number, level, name) and why a person is
     needed inside it. All shut at first. */
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [sectionOpen, setSectionOpen] = useState(false);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="a11y-section a11y-w22" aria-labelledby="a11y-w22-heading">
      {/* The whole section is one caret (user's instruction, 25 Nov 2026,
          "this whole content needs to be a caret"): the title opens and
          shuts the sentence and the six items, and the when and the fail
          count stay under it shut, as the picture of the shut section
          showed. Shut at first. */}
      <h2 className="a11y-section-title a11y-w22-title" id="a11y-w22-heading" data-nav-label={t("WCAG 2.2")}>
        <button
          type="button"
          className="a11y-w22-head"
          aria-expanded={sectionOpen}
          aria-controls="a11y-w22-desc a11y-w22-body"
          onClick={() => setSectionOpen((v) => !v)}
        >
          {t("Ready for WCAG 2.2?")}
        </button>
      </h2>

      {/* The heading already names the standard, so the line under it
          says only when, and the six items are listed once, in the
          schedule below (user's instruction, 22 Nov 2026, "delete all
          repetition"). */}
      <WhatsNextPanel
        expected={tf("Expected {date}", { date: expectedFrom })}
        /* No "1 would fail today" in the head: the failing row below
           carries that call itself (user's instruction, 25 Nov 2026, "no
           repetition"). */
        description={tf(
          "Not required yet. The {total} new items count once EN 301 549 adopts WCAG 2.2.",
          { total }
        )}
        descriptionId="a11y-w22-desc"
        descriptionHidden={!sectionOpen}
      />

      {/* The six items stand open under the sentence (user's instruction,
          23 Nov 2026, "just unfold all info under text"): no title and no
          Show details toggle over them, since the sentence names them. */}
      <div className="a11y-w22-panel" id="a11y-w22-body" hidden={!sectionOpen}>
        {/* A list of caret rows, as the findings (user's instruction, 24 Nov
            2026, "align properly and make a carret"): the triangle, the
            plain question, the call at the far end; opened, the criterion
            (number, level, official name) and why a person is needed.
            Nothing here is a requirement yet, so the only weight any row
            takes is the red call of an item that would fail today.
            "Level A and AA" in the name is load-bearing: WCAG 2.2 adds nine
            criteria, and six is the count of the A/AA subset shown here. */}
        <ul className="a11y-w22-list" aria-label={tf("The {total} new Level A and AA items in WCAG 2.2, checked where software can", { total })}>
          {criteria.map((c) => {
            const fails = c.status === "already-failing";
            const isOpen = open.has(c.id);
            const detailId = `a11y-w22-${c.id.replace(/\./g, "-")}`;
            return (
              <li key={c.id} className="a11y-w22-row" data-fails={fails ? "" : undefined} data-open={isOpen || undefined}>
                <button
                  type="button"
                  className="a11y-w22-toggle"
                  aria-expanded={isOpen}
                  aria-controls={detailId}
                  onClick={() => toggle(c.id)}
                >
                  <span className="a11y-w22-q">{fails ? c.failing : c.plain}</span>
                  <span className="a11y-w22-call">
                    {/* Not measured has no tick and no cross: the check that
                        decides it died on this scan, and a pass would
                        overclaim. */}
                    {c.status === "not-measured" ? (
                      <span className="a11y-next-status" data-call="not-measured" data-status="not-measured">
                        {t(STATUS_LABEL[c.status])}
                      </span>
                    ) : c.status !== "needs-review" ? (
                      <span className="a11y-next-status" data-status={fails ? "failed" : "no-issues-found"}>
                        {t(STATUS_LABEL[c.status])}
                      </span>
                    ) : (
                      <span className="a11y-next-status" data-call={c.coverage} data-status="needs-review">
                        {c.coverage === "automated" ? t("Software can check it") : t("Needs a person")}
                      </span>
                    )}
                  </span>
                </button>
                {/* The count rides as a sentence under the question: only a
                    failing item ever has one. */}
                {c.findingCount > 0 && (
                  <span className="a11y-w22-count">
                    {c.findingCount === 1
                      ? t("1 finding in this report")
                      : tf("{count} findings in this report", { count: c.findingCount })}
                  </span>
                )}
                <div id={detailId} className="a11y-w22-detail" hidden={!isOpen}>
                  <p className="a11y-w22-detail-ref">
                    <span className="a11y-w22-id">{c.id}</span>
                    {" — "}
                    <span className="a11y-w22-level">{t("Level")} {c.level}</span>
                    {" — "}
                    <span className="a11y-w22-name">{c.name}</span>
                  </p>
                  {c.whyManual && <p className="a11y-w22-why">{c.whyManual}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        {parsingNoLongerCounts && (
          <p className="a11y-notice">
            {t("WCAG 2.2 drops 4.1.1 Parsing, so its failure here will stop counting.")}
          </p>
        )}
      </div>
    </section>
  );
}
