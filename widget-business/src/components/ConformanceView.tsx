import { useId, useMemo, useState, type CSSProperties } from "react";
import { t, tf } from "../lib/strings";
import type { ConformanceSummary, CriterionResult, RecordedVerdict } from "../api/scanClient";
import { statusWord } from "./ManualChecks";
import { DataTable } from "./DataTable";

// Answers the question the 0-100 score can't: "are we compliant?"
//
// Deliberately never says yes. A scan can evidence a failure; it cannot
// evidence conformance, because a large share of WCAG can only be judged by a
// person. Every label here is a statement about our evidence, not a verdict on
// the site — which is also the difference between a report a specialist will
// respect and one they'll dismiss.

/* Where a status bubble sits on its row: a tilt of -4 to 4 degrees and a
   place from 30% to 70% across the row's text column, read from the
   criterion's id (a small string hash), so a row's bubble never moves
   between renders. The WCAG 2.2 schedule places its calls with it too. */
export function bubblePlace(id: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const tilt = ((h % 81) - 40) / 10;
  const across = 30 + ((h >>> 7) % 41);
  return { "--bubble-tilt": `${tilt}deg`, "--bubble-x": `${across}%` } as CSSProperties;
}

const STATUS_LABEL = {
  failed: "Fails",
  "no-issues-found": "Nothing found",
  "needs-review": "Needs a person",
  // Not the same as needs-review: a person was never going to be required
  // here — our check was, and it did not finish. Without this state a
  // crashed probe rendered the same row as a clean page.
  "not-measured": "Not measured",
} as const;

/* The three the design names. Real ones, not invented: each is a WCAG 2.1
   criterion whose result axe reports as "incomplete" — it cannot judge
   whether a caption is correct, only whether one exists. The rest are named
   in the checklist below rather than listed twice. */
const HUMAN_QUESTIONS = [
  "Do audio and video have a text version?",
  "Do your videos have captions?",
  "Do videos say out loud what's shown on screen?",
];

/* Counts come from the conformance summary, never recounted here. */
type Filter = "failed" | "needs-review" | "no-issues-found" | "not-measured" | "all";

/* The sentence under the count is back (user's instruction, 24 Nov 2026,
   "bring this design back", with a picture of the cards as first set on
   23 Nov): the status word small at the top, the count, then "We found
   problems", "We checked, found nothing", "We couldn't check" or "A check
   didn't finish" large under it. It was dropped on 23 Nov as restating the
   status badge. */
function RESULT_ROWS(c: ConformanceSummary): Array<{
  key: string;
  /** The checklist filter this tile opens. */
  filter: Filter;
  severity: string;
  label: string;
  meaning?: string;
  mark: string;
  n: number;
}> {
  return [
    { key: "failed", filter: "failed", severity: "critical", label: t("We found problems"),
      meaning: tf("{a} at level A, {aa} at AA", { a: c.failedByLevel.A, aa: c.failedByLevel.AA }),
      mark: t("Fix first"), n: c.failed },
    // No meaning line on these two: the band above says "nothing found"
    // is not a pass, and the mark says "Needs a person".
    { key: "clean", filter: "no-issues-found", severity: "pass", label: t("We checked, found nothing"),
      mark: t("Nothing found"), n: c.noIssuesFound },
    { key: "human", filter: "needs-review", severity: "minor", label: t("We couldn't check"),
      mark: t("Needs a person"), n: c.needsReview },
    // Only present when it happened. A permanent zero row would teach readers
    // to skip it; when a check breaks, this is the row that keeps the clean
    // count honest.
    ...((c.notMeasured ?? 0) > 0
      ? [{ key: "not-measured", filter: "not-measured" as const, severity: "serious", label: t("A check didn't finish"),
          mark: t("Not measured"), n: c.notMeasured ?? 0 }]
      : []),
  ];
}

/* The checks that left a row unmeasured, as one sentence. The names are the
   report's own, translated one by one the way checkNames does; the list is
   joined by a key of its own, so "and" is never English inside a German
   sentence. */
function unfinishedChecks(names: string[]): string {
  const local = names.map((n) => t(n));
  return local.length === 1
    ? tf("The {check} check didn’t finish this scan", { check: local[0] })
    : tf("The {checks} checks didn’t finish this scan", {
        checks: local.reduce((a, b) => tf("{a} and {b}", { a, b })),
      });
}

/* "Decided: Meets it " and the em that follows it. The sentence is
   translated whole and split where the em goes, so the lead stays ONE text
   node ending in a space — as four adjacent nodes ("Decided", ": ", word,
   " ") the trailing space measured 0px wide and the em welded on. */
function DecidedLine({ verdict }: { verdict: RecordedVerdict }) {
  const [lead, tail] = tf("Decided: {status} {detail}", { status: statusWord(verdict.status) }).split(
    "{detail}"
  );
  return (
    <span className="a11y-manual-verdict">
      {lead}
      <em>
        ({verdict.decidedBy}, {verdict.decidedAt.slice(0, 10)})
      </em>
      {tail}
    </span>
  );
}

/* One criterion of the checklist, under its result's caret. */
function CriterionRow({ c, verdict }: { c: CriterionResult; verdict?: RecordedVerdict }) {
  return (
    <li
      className={`a11y-conf-row a11y-conf-${c.status}`}
    >
      <span className="a11y-conf-id">
        {c.id} <em>{c.level}</em>
      </span>
      <span className="a11y-conf-body">
        {/* A failing row states the problem; the rest ask the
            question, because for those we have no problem to
            report — only something we didn't find, or couldn't
            check. */}
        <strong>{c.status === "failed" ? c.failing : c.plain}</strong>
        <span className="a11y-conf-plain">
          {c.name}
        </span>
        {/* Say which check broke, or "not measured" is just a
            shrug. The names are the report's own, the same ones
            the warning banner above uses. */}
        {c.status === "not-measured" && c.notMeasured && c.notMeasured.length > 0 && (
          <span className="a11y-conf-plain">{unfinishedChecks(c.notMeasured)}</span>
        )}
        {/* Only where the scan left the question open. A measured
            failure is not overruled by an opinion. */}
        {c.status !== "failed" && verdict && (
          <DecidedLine verdict={verdict} />
        )}
      </span>
      {/* A small bubble that sits on its row at a place and tilt
          of its own (user's instruction, 23 Nov 2026, "design
          these badges randomly sit on related content in small
          bubles", "it need to say fails in 2 places"). The
          place comes from the criterion's id, so it stays put
          across renders and differs from row to row. Still last
          in the row's markup, so a screen reader meets it after
          the line it qualifies. */}
      <span className="a11y-conf-status" data-status={c.status} style={bubblePlace(c.id)}>
        {c.status === "failed" && c.findingCount > 0
          ? c.findingCount === 1
            ? t("Fails in 1 place")
            : tf("Fails in {count} places", { count: c.findingCount })
          : t(STATUS_LABEL[c.status])}
      </span>
    </li>
  );
}

export function ConformanceView({
  conformance,
  showBfsgNote = false,
  verdicts = [],
}: {
  conformance: ConformanceSummary;
  /** A person's recorded answers for this site, shown on the rows the scan
   *  could not decide. The row's status stays what the scan measured — a
   *  decision is shown beside it, never in place of it. */
  verdicts?: RecordedVerdict[];
  // One factual sentence naming the German law, shown to business readers who
  // asked what the score means for them legally. Once per report, no alarm,
  // no fine amounts — the same rules the AI layer's legal framing follows.
  showBfsgNote?: boolean;
}) {
  const verdictFor = useMemo(() => new Map(verdicts.map((v) => [v.criterion, v])), [verdicts]);
  // The result groups that are open. More than one may be open at once:
  // a reader comparing the failures with the items needing a person should
  // not have to shut one to open the other.
  const [openGroups, setOpenGroups] = useState<ReadonlySet<Filter>>(() => new Set());
  const panelId = useId();
  const toggleGroup = (f: Filter) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  // One sentence with the filter's name set into it in bold, split where
  // the name goes rather than stitched from fragments.
  const [otherBefore, otherAfter] = tf(
    "{count} more are under {filter} in the checklist below.",
    { count: conformance.needsReview - HUMAN_QUESTIONS.length }
  ).split("{filter}");

  return (
    <section className="a11y-section a11y-conf" aria-labelledby="a11y-conf-heading">
      {/* The design's legal-standard head: a centred title with the standard
          as a black pill, the "not a pass" band, and the automated results
          beside what they do and don't tell you. Ported from
          templates/legal-standard/LegalStandard.jsx, read from the design
          project — every colour below is its own. */}
      <div className="a11y-legal-head">
        <h2 className="a11y-legal-title" id="a11y-conf-heading" data-nav-label={t("Legal standard")}>
          {t("Do you meet the legal standard?")}
        </h2>
        <span className="a11y-legal-standard">{conformance.standard}</span>
        <p className="a11y-legal-intro">
          {tf("The {total} items EU accessibility law checks sites against.", {
            total: conformance.total,
          })}
          {showBfsgNote && (
            <>
              {" "}
              {t(
                "In Germany the BFSG points at it."
              )}
            </>
          )}
        </p>
      </div>

      {/* The band. Its claim is the one thing in this section a reader must
          not miss, which is why the design gives it the full width and the
          brand yellow rather than a line of prose. */}
      <div className="a11y-legal-band" aria-labelledby="a11y-legal-band-heading">
        <h3 className="a11y-legal-eyebrow" id="a11y-legal-band-heading">
          {t("“Nothing found” is not a pass")}
        </h3>
        <div className="a11y-legal-card">
          <p className="a11y-legal-lead">
            {t("Every A and AA item has to pass.")} {t("One failure means you don’t meet the standard.")}
          </p>
        </div>
      </div>

      <div className="a11y-legal-grid">
        <div className="a11y-legal-panel" aria-labelledby="a11y-legal-tells-heading">
          {/* The questions alone (user's instructions, 22 Nov 2026, "delete
              all repetition", "do not over explain"): "It can't confirm that
              anything meets the standard" said the band above again, and the
              count of items needing a person is the Needs a person tile. */}
          <h3 className="a11y-legal-eyebrow" id="a11y-legal-tells-heading">{t("Questions no software can answer")}</h3>
          <div className="a11y-legal-card">
            <div className="a11y-legal-questions">
              {HUMAN_QUESTIONS.map((q, i) => (
                <span key={q} className="a11y-legal-q">
                  <span className="a11y-legal-qnum" aria-hidden="true">{i + 1}</span>
                  <span>{t(q)}</span>
                </span>
              ))}
              {conformance.needsReview > HUMAN_QUESTIONS.length && (
                <span className="a11y-legal-q a11y-legal-q-more">
                  <span className="a11y-legal-qnum" aria-hidden="true">
                    {HUMAN_QUESTIONS.length + 1}
                  </span>
                  <span>
                    {otherBefore}
                    <strong>{t("Needs a person")}</strong>
                    {otherAfter}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="a11y-legal-results" aria-labelledby="a11y-legal-results-heading">
          <h3 className="a11y-legal-eyebrow" id="a11y-legal-results-heading">
            {t("Automated check results")}
          </h3>
          <div className="a11y-legal-thead" aria-hidden="true">
            <span className="a11y-legal-col-result">{t("Result")}</span>
            <span className="a11y-legal-col-items">{t("Items")}</span>
          </div>
          {/* Each result is a caret (user's instruction, 24 Nov 2026, "this
              can be carrets as well"): the line opens its own group of the
              checklist in place, under it inside the panel, and shuts again.
              That replaces the lines as a filter and the Show the checklist
              button under them, so every criterion is listed once, under
              its result. Every group stays in the DOM, hidden when shut: a
              printed report is compliance evidence, and the print
              stylesheet can reveal a hidden element but not one React never
              rendered. */}
          <ul className="a11y-legal-tiles a11y-legal-carets" role="list">
          {RESULT_ROWS(conformance).map((r) => {
            const open = openGroups.has(r.filter);
            const rows = conformance.criteria.filter((c) => c.status === r.filter);
            return (
              <li key={r.key} className={`a11y-legal-caret a11y-legal-caret-${r.key}`} data-open={open || undefined}>
                <button
                  type="button"
                  className={`a11y-legal-row a11y-legal-row-${r.key}`}
                  aria-controls={`${panelId}-${r.key}`}
                  aria-expanded={open}
                  onClick={() => toggleGroup(r.filter)}
                >
                  {/* Read left to right as drawn: the sentence, the count in
                      the middle of the row (user's instruction, 24 Nov 2026,
                      "numbers can go in the middle"), then the small print,
                      its parts parted by a comma. */}
                  <span className="a11y-legal-col-result">
                    <span className="a11y-legal-row-label">{r.label}</span>
                  </span>
                  <span className="a11y-legal-count">{r.n}</span>
                  <span className="a11y-legal-row-desc">
                    <span className={`a11y-legal-mark a11y-legal-mark-${r.severity}`}>{r.mark}</span>
                    {r.meaning && <span className="a11y-legal-row-meaning">{r.meaning}</span>}
                  </span>
                </button>
                <div id={`${panelId}-${r.key}`} className="a11y-conf-panel a11y-legal-group" hidden={!open}>
                  {rows.length === 0 ? (
                    r.filter === "failed" && <p className="a11y-conf-caveat">{t("Nothing on this page fails.")}</p>
                  ) : (
                    <ul className="a11y-conf-list">
                      {rows.map((c) => (
                        <CriterionRow key={c.id} c={c} verdict={verdictFor.get(c.id)} />
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
          </ul>
          {/* No footer restating the standard and the item count: the chip and
              the line under the title above already say both. */}
        </div>
      </div>


      {/* The plain-text repeat of the two panels above used to sit here —
          seven sentences, twice each, in both audiences. The panels are
          already text; a screen reader read them twice. */}

    </section>
  );
}
