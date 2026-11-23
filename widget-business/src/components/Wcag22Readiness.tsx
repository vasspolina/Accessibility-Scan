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
  const { alreadyFailing, total, criteria, parsingNoLongerCounts } = readiness;
  // The backend writes the date in English ("late 2026"). Looked up like the
  // backend's check names: a date with no translation stays as it came.
  const expectedFrom = t(readiness.expectedFrom);

  return (
    <section className="a11y-section a11y-w22" aria-labelledby="a11y-w22-heading">
      <h2 className="a11y-section-title" id="a11y-w22-heading" data-nav-label={t("WCAG 2.2")}>{t("Ready for WCAG 2.2?")}</h2>

      {/* The heading already names the standard, so the line under it
          says only when, and the six items are listed once, in the
          breakdown below (user's instruction, 22 Nov 2026, "delete all
          repetition"). */}
      <WhatsNextPanel
        expected={tf("Expected {date}", { date: expectedFrom })}
        failCount={alreadyFailing}
        description={tf(
          "Not required yet. The {total} new items count once EN 301 549 adopts WCAG 2.2.",
          { total }
        )}
      />

      {/* The six items stand open under the sentence (user's instruction,
          23 Nov 2026, "this six new items repeating, just unfold all info
          under text"): the sentence above already says there are six new
          items, so the "The six new items" title and its Show details
          toggle are gone. */}
      <div className="a11y-w22-panel">
          {/* "What actually changes" is gone (user's instruction, 22 Nov
              2026, "do not over explain"): it said the lead and the date
              again. */}
          {/* The "Software can check only one" column and its five questions
              are gone: the cards below ask the same questions, each with its
              own call. */}

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
          {/* "Level A and AA" is load-bearing: WCAG 2.2 adds nine criteria,
              and six is the count of the A/AA subset this section shows. */}
          <ul className="a11y-next-list" aria-label={tf("The {total} new Level A and AA items in WCAG 2.2, checked where software can", { total })}>
            {criteria.map((c) => {
              const fails = c.status === "already-failing";
              return (
                <li key={c.id} className={fails ? "a11y-next-crit-item" : undefined}>
                  <span className="a11y-next-main">
                    <span className="a11y-next-title">
                      {fails ? c.failing : c.plain}
                    </span>
                    <span className="a11y-next-meta">
                      {c.id} · {t("Level")} {c.level}
                    </span>
                    {c.whyManual && <span className="a11y-next-meta">{c.whyManual}</span>}
                    <span className="a11y-next-meta">{c.name}</span>
                    {/* The count rides as a sentence with the rest of the
                        meta, not as a corner "1 ×" mark: only a failing card
                        ever has one, and a bare glyph on one card in six
                        reads as clutter, not as information. */}
                    {c.findingCount > 0 && (
                      <span className="a11y-next-meta">
                        {c.findingCount === 1
                          ? t("1 finding in this report")
                          : tf("{count} findings in this report", { count: c.findingCount })}
                      </span>
                    )}
                    {/* Every card carries its call, per the design. The
                        earlier omission — "Needs a person is stated once,
                        up there" — was reasoned against short rows a reader
                        met after the caveat; now each card is a standalone
                        whyManual block met in any order, and a card without
                        its call reads as unclassified rather than covered.
                        Already-failing and already-clean keep their status
                        chip; the rest are called by coverage. */}
                    {c.status === "not-measured" ? (
                      /* No tick and no cross: the check that decides this row
                         died on this scan. A "✓" here — which the old
                         status!=="needs-review" branch would have drawn — is
                         the exact overclaim this block refuses elsewhere. */
                      <span className="a11y-next-status" data-call="not-measured" data-status="not-measured">
                        {t(STATUS_LABEL[c.status])}
                      </span>
                    ) : c.status !== "needs-review" ? (
                      /* A badge since 23 Nov 2026 ("needs a person, nothing
                         found etc can be also badges"): the words carry the
                         call, so the tick and warning icons went. */
                      <span className="a11y-next-status" data-status={fails ? "failed" : "no-issues-found"}>
                        {t(STATUS_LABEL[c.status])}
                      </span>
                    ) : (
                      <span className="a11y-next-status" data-call={c.coverage} data-status="needs-review">
                        {c.coverage === "automated" ? t("Software can check it") : t("Needs a person")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {parsingNoLongerCounts && (
            <p className="a11y-notice">
              {t("This scan reports a failure against 4.1.1 Parsing. WCAG 2.2 removes that criterion as obsolete, so once the standard updates, that failure no longer counts.")}
            </p>
          )}
      </div>
    </section>
  );
}
