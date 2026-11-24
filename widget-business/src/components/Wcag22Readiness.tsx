import { t, tf } from "../lib/strings";
import { WhatsNextPanel } from "./WhatsNextPanel";
import { bubblePlace } from "./ConformanceView";
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
          schedule below (user's instruction, 22 Nov 2026, "delete all
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
          23 Nov 2026, "just unfold all info under text"): no title and no
          Show details toggle over them, since the sentence names them. */}
      <div className="a11y-w22-panel">
        {/* A ruled schedule (user's instruction, 23 Nov 2026, "design this
            properly with lines and stuff"): one row per item between 1px
            ink rules, in three columns. The criterion (number, level,
            official name) on the left, the plain question and why a person
            is needed in the middle, the call at the right. The columns fold
            to two, then one, by the list's own width.
            Nothing here is a requirement yet, so the only weight any row
            takes is the pink call of an item that would fail today.
            "Level A and AA" in the name is load-bearing: WCAG 2.2 adds nine
            criteria, and six is the count of the A/AA subset shown here. */}
        <ul className="a11y-w22-list" aria-label={tf("The {total} new Level A and AA items in WCAG 2.2, checked where software can", { total })}>
          {criteria.map((c) => {
            const fails = c.status === "already-failing";
            return (
              <li key={c.id} className="a11y-w22-row" data-fails={fails ? "" : undefined} style={bubblePlace(c.id)}>
                <span className="a11y-w22-ref">
                  <span className="a11y-w22-id">{c.id}</span>
                  <span className="a11y-w22-level">{t("Level")} {c.level}</span>
                  <span className="a11y-w22-name">{c.name}</span>
                </span>
                <span className="a11y-w22-body">
                  <span className="a11y-w22-q">{fails ? c.failing : c.plain}</span>
                  {c.whyManual && <span className="a11y-w22-why">{c.whyManual}</span>}
                  {/* The count rides as a sentence, not a corner "1 ×" mark:
                      only a failing item ever has one. */}
                  {c.findingCount > 0 && (
                    <span className="a11y-w22-count">
                      {c.findingCount === 1
                        ? t("1 finding in this report")
                        : tf("{count} findings in this report", { count: c.findingCount })}
                    </span>
                  )}
                </span>
                <span className="a11y-w22-call">
                  {/* Every item carries its call, as a badge (23 Nov 2026).
                      Not measured has no tick and no cross: the check that
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
