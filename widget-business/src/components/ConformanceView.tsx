import { useId, useMemo, useRef, useState } from "react";
import { t } from "../lib/strings";
import type { ConformanceSummary, CriterionResult } from "../api/scanClient";
import { DataTable } from "./DataTable";

// Answers the question the 0-100 score can't: "are we compliant?"
//
// Deliberately never says yes. A scan can evidence a failure; it cannot
// evidence conformance, because a large share of WCAG can only be judged by a
// person. Every label here is a statement about our evidence, not a verdict on
// the site — which is also the difference between a report a specialist will
// respect and one they'll dismiss.

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
function RESULT_ROWS(c: ConformanceSummary) {
  return [
    { key: "failed", severity: "critical", label: "We found problems",
      meaning: `${c.failedByLevel.A} at level A, ${c.failedByLevel.AA} at AA`,
      mark: "Fix first", n: c.failed },
    { key: "clean", severity: "pass", label: "We checked, found nothing",
      meaning: "Still worth a human look", mark: "Pass", n: c.noIssuesFound },
    { key: "human", severity: "minor", label: "We couldn't check",
      meaning: "Only a person can judge these. Every one is named below.",
      mark: "Needs a person", n: c.needsReview },
    // Only present when it happened. A permanent zero row would teach readers
    // to skip it; when a check breaks, this is the row that keeps the clean
    // count honest.
    ...((c.notMeasured ?? 0) > 0
      ? [{ key: "not-measured", severity: "serious", label: "A check didn't finish",
          meaning: "These weren't examined this time. A second run usually completes them.",
          mark: "Not measured", n: c.notMeasured ?? 0 }]
      : []),
  ];
}

export function ConformanceView({
  conformance,
  showBfsgNote = false,
}: {
  conformance: ConformanceSummary;
  // One factual sentence naming the German law, shown to business readers who
  // asked what the score means for them legally. Once per report, no alarm,
  // no fine amounts — the same rules the AI layer's legal framing follows.
  showBfsgNote?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Three states, not the boolean this used to be. "We couldn't check" is
  // the largest row in the table above and was also the hardest to act on:
  // the reader saw a count of 22 and had no way to reach the 22 without
  // clearing a filter that defaulted to failures-only. Naming that group as
  // a filter of its own is what makes the count answerable.
  const [filter, setFilter] = useState<"failed" | "needs-review" | "not-measured" | "all">("failed");
  const panelId = useId();
  const filterName = useId();
  // The toggle stays mounted whichever state we're in, so keyboard focus
  // never evaporates when the panel opens or closes. The convenience "hide"
  // at the bottom of a long checklist hands focus back up here.
  const toggleRef = useRef<HTMLButtonElement>(null);

  const failing = useMemo(
    () => conformance.criteria.filter((c) => c.status === "failed"),
    [conformance.criteria]
  );
  // The criteria behind the "We couldn't check" count. Naming a few of them
  // in the caveat below beats the two hardcoded examples that used to stand
  // in for the whole group: those were written once and could describe a
  // set that no longer contains them.
  const needsPerson = useMemo(
    () => conformance.criteria.filter((c) => c.status === "needs-review"),
    [conformance.criteria]
  );
  const notMeasured = useMemo(
    () => conformance.criteria.filter((c) => c.status === "not-measured"),
    [conformance.criteria]
  );
  // Every criterion is rendered; the filter hides rather than removes. On
  // screen that is identical. On paper it is the difference between a record
  // of what was checked and a list of what went wrong — a printed compliance
  // document that omits the 22 criteria needing a person is hiding the most
  // honest part of the report. Filtering by not rendering put those rows
  // beyond the reach of the print stylesheet entirely.
  const shown = conformance.criteria;
  const isFilteredOut = (status: CriterionResult["status"]) =>
    filter !== "all" && status !== filter;

  return (
    <section className="a11y-section a11y-conf" aria-labelledby="a11y-conf-heading">
      {/* The design's legal-standard head: a centred title with the standard
          as a black pill, the "not a pass" band, and the automated results
          beside what they do and don't tell you. Ported from
          templates/legal-standard/LegalStandard.jsx, read from the design
          project — every colour below is its own. */}
      <div className="a11y-legal-head">
        <h2 className="a11y-legal-title" id="a11y-conf-heading" data-nav-label={t("Legal standard")}>
          Do you meet the legal standard?
        </h2>
        <span className="a11y-legal-standard">{conformance.standard}</span>
        <p className="a11y-legal-intro">
          The checklist of {conformance.total} items European accessibility law
          measures sites against.
          {showBfsgNote &&
            " In Germany this is the standard the BFSG points at. That law implements the European Accessibility Act and has been in force since June 2025."}
        </p>
      </div>

      {/* The band. Its claim is the one thing in this section a reader must
          not miss, which is why the design gives it the full width and the
          brand yellow rather than a line of prose. */}
      <section className="a11y-legal-band" aria-labelledby="a11y-legal-band-heading">
        <h3 className="a11y-legal-eyebrow" id="a11y-legal-band-heading">
          So &ldquo;nothing found&rdquo; is not a pass
        </h3>
        <div className="a11y-legal-card">
          <p className="a11y-legal-lead">
            You need every item at both levels, A and AA. They don&rsquo;t average out.
          </p>
          <p className="a11y-legal-body">
            One Level A failure means you don&rsquo;t meet the standard.
          </p>
        </div>
      </section>

      <div className="a11y-legal-grid">
        <section className="a11y-legal-panel" aria-labelledby="a11y-legal-tells-heading">
          <h3 className="a11y-legal-eyebrow" id="a11y-legal-tells-heading">What this tells you</h3>
          <div className="a11y-legal-card">
            <p className="a11y-legal-lead">
              What your site gets wrong, not what it gets right.
            </p>
            <p className="a11y-legal-body">
              {conformance.needsReview} of the {conformance.total} items need a
              person. That&rsquo;s true of every automated check, not just this one.
            </p>
            <div className="a11y-legal-questions">
              <p className="a11y-legal-micro">Questions no software can answer</p>
              {HUMAN_QUESTIONS.map((q, i) => (
                <span key={q} className="a11y-legal-q">
                  <span className="a11y-legal-qnum" aria-hidden="true">{i + 1}</span>
                  <span>{q}</span>
                </span>
              ))}
              {conformance.needsReview > HUMAN_QUESTIONS.length && (
                <span className="a11y-legal-q a11y-legal-q-more">
                  <span className="a11y-legal-qnum" aria-hidden="true">
                    {HUMAN_QUESTIONS.length + 1}
                  </span>
                  <span>
                    The other {conformance.needsReview - HUMAN_QUESTIONS.length} are in
                    the checklist below. Choose <strong>Needs a person</strong> to see them.
                  </span>
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="a11y-legal-results" aria-labelledby="a11y-legal-results-heading">
          <h3 className="a11y-legal-eyebrow" id="a11y-legal-results-heading">
            Automated check results
          </h3>
          <div className="a11y-legal-thead" aria-hidden="true">
            <span className="a11y-legal-col-result">Result</span>
            <span className="a11y-legal-col-items">Items</span>
          </div>
          {RESULT_ROWS(conformance).map((r) => (
            <div key={r.key} className="a11y-legal-row">
              <span className="a11y-legal-col-result">
                <span className="a11y-legal-row-label">{r.label}</span>
                <span className="a11y-legal-row-meaning">{r.meaning}</span>
                <span className={`a11y-legal-mark a11y-legal-mark-${r.severity}`}>{r.mark}</span>
              </span>
              <span className="a11y-legal-count">{r.n}</span>
            </div>
          ))}
          <p className="a11y-legal-micro a11y-legal-foot">
            Against the {conformance.standard} checklist of {conformance.total} items
          </p>
        </section>
      </div>


      <div className="a11y-conf-caveat">
        <p>
          <strong>What this tells you.</strong> What your site gets wrong, not what it gets right.
        </p>
        <p>
          {conformance.needsReview} of the {conformance.total} items need a person. That's true of
          every automated check, not just this one.
        </p>
        {/* The questions themselves, taken from the criteria actually in
            this state rather than from two examples written once and left
            to drift. Three is what fits before the list stops being read;
            the rest are one click away in the checklist below. */}
        {needsPerson.length > 0 && (
          <>
            <p>Questions no software can answer, for example:</p>
            <ul className="a11y-conf-examples">
              {needsPerson.slice(0, 3).map((c) => (
                <li key={c.id}>{c.plain}</li>
              ))}
            </ul>
            {needsPerson.length > 3 && (
              <p>
                The other {needsPerson.length - 3} are in the checklist below. Choose{" "}
                <strong>Needs a person</strong> to see them.
              </p>
            )}
          </>
        )}
        <p>
          So <strong>&ldquo;nothing found&rdquo; is not a pass.</strong>
        </p>
        {conformance.failedByLevel.A > 0 && (
          <p>
            You need every item at both levels, A and AA. They don't average out. One Level A
            failure means you don't meet the standard.
          </p>
        )}
      </div>

      <button
        ref={toggleRef}
        type="button"
        className="a11y-show-all"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide the checklist" : "Show the checklist"}
      </button>

      {/* Always in the DOM, hidden when collapsed. A printed report is
          compliance evidence, and behind a conditional this checklist — the
          substance of it — appeared on paper only if the reader happened to
          expand it first. The print stylesheet can reveal a hidden element;
          it cannot reveal one React never rendered. */}
      <div id={panelId} className="a11y-conf-panel" hidden={!expanded}>
          {/* The counts belong here rather than on the button that opens
              this panel. That button used to promise "Show all 50 items"
              and then show three, because a filter was on by default — it
              described the checklist's length while the reader got the
              filtered view. Here each number sits on the option it
              selects, so every one of them is true. */}
          <fieldset className="a11y-radio-group a11y-conf-filter">
            <legend>Show</legend>
            {(
              [
                ["failed", `Failures (${failing.length})`],
                ["needs-review", `Needs a person (${needsPerson.length})`],
                // The chip exists only when the state does — an always-empty
                // filter would be a control that never does anything.
                ...(notMeasured.length > 0
                  ? ([["not-measured", `Not measured (${notMeasured.length})`]] as const)
                  : []),
                ["all", `Everything (${conformance.total})`],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="a11y-radio">
                <input
                  type="radio"
                  name={filterName}
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          {failing.length === 0 && filter === "failed" ? (
            <p className="a11y-conf-caveat">Nothing on this page fails.</p>
          ) : (
            <ul className="a11y-conf-list">
              {shown.map((c) => (
                <li
                  key={c.id}
                  className={`a11y-conf-row a11y-conf-${c.status}`}
                  hidden={isFilteredOut(c.status)}
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
                      Officially: {c.name}
                    </span>
                    {/* Say which check broke, or "not measured" is just a
                        shrug. The names are the report's own, the same ones
                        the warning banner above uses. */}
                    {c.status === "not-measured" && c.notMeasured && c.notMeasured.length > 0 && (
                      <span className="a11y-conf-plain">
                        The {c.notMeasured.join(" and ")} check{c.notMeasured.length > 1 ? "s" : ""} didn&rsquo;t finish this scan
                      </span>
                    )}
                  </span>
                  <span className="a11y-conf-status">
                    {t(STATUS_LABEL[c.status])}
                    {/* "(13)" leaves the reader to guess thirteen of what.
                        Say it: thirteen places on this page. */}
                    {c.findingCount > 0 && (
                      <em className="a11y-conf-count">
                        {c.findingCount === 1 ? "1 place" : `${c.findingCount} places`}
                      </em>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="a11y-show-all"
            onClick={() => {
              setExpanded(false);
              // This button is about to hide with the panel it lives in —
              // hand focus back to the toggle rather than dropping it.
              toggleRef.current?.focus();
            }}
          >
            Hide the checklist
          </button>
      </div>
    </section>
  );
}
