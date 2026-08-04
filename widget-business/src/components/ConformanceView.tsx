import { useId, useMemo, useRef, useState } from "react";
import { DataTable } from "@verify/design-system";
import type { ConformanceSummary, CriterionResult } from "../api/scanClient";

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
} as const;

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
  const [filter, setFilter] = useState<"failed" | "needs-review" | "all">("failed");
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
      <h2 className="a11y-section-title" id="a11y-conf-heading" data-nav-label="Legal standard">
        Do you meet the legal standard?{" "}
        <span className="a11y-section-count">{conformance.standard}</span>
      </h2>
      <p className="a11y-section-desc">
        The checklist of {conformance.total} items European accessibility law measures sites against.
        {showBfsgNote &&
          " In Germany this is the standard the BFSG points at. That law implements the European Accessibility Act and has been in force since June 2025."}
      </p>

      {/* The kit's LegalStandard screen: the three tiles as a tinted-row
          table — glyph + words + count + meaning, never colour alone. */}
      <DataTable
        caption={`Automated check results against the ${conformance.standard} checklist of ${conformance.total} items`}
        // Two columns, not three: the verdict and what it means used to sit
        // side by side, which left "What it means" a sliver that broke its
        // own sentences mid-word on a phone. The verdict folds on top of the
        // text it introduces instead — one column with room to wrap, and the
        // count beside it.
        headers={[
          { key: "result", label: "Result" },
          { key: "items", label: "Items", align: "right", width: "90px" },
        ]}
        rows={[
          {
            id: "failed",
            background: "var(--severity-critical-bg, #fff1f1)",
            cells: [
              <span key="r" className="a11y-conf-cell">
                <span className="a11y-conf-result a11y-conf-result-fail">
                  <span aria-hidden="true">!</span> We found problems
                </span>
                <span className="a11y-conf-meaning">
                  {`${conformance.failedByLevel.A} at level A, ${conformance.failedByLevel.AA} at AA`}
                </span>
              </span>,
              String(conformance.failed),
            ],
          },
          {
            id: "clean",
            background: "var(--severity-pass-bg, #defbe6)",
            cells: [
              <span key="r" className="a11y-conf-cell">
                <span className="a11y-conf-result a11y-conf-result-pass">
                  <span aria-hidden="true">✓</span> We checked, found nothing
                </span>
                <span className="a11y-conf-meaning">Still worth a human look</span>
              </span>,
              String(conformance.noIssuesFound),
            ],
          },
          {
            id: "manual",
            background: "var(--severity-minor-bg, #f4f4f4)",
            cells: [
              <span key="r" className="a11y-conf-cell">
                <span className="a11y-conf-result a11y-conf-result-minor">
                  <span aria-hidden="true">i</span> We couldn't check
                </span>
                <span className="a11y-conf-meaning">
                  Only a person can judge these.
                  {/* Claimed only when the checklist really does hold all of
                      them. The backend builds criteria and this count from
                      the same array so they agree in practice — but a
                      summary number that outran the list it points at would
                      make this sentence a lie, and it is cheap to not say. */}
                  {needsPerson.length === conformance.needsReview && " Every one is named below."}
                </span>
              </span>,
              String(conformance.needsReview),
            ],
          },
        ]}
      />

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
                  </span>
                  <span className="a11y-conf-status">
                    {STATUS_LABEL[c.status]}
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
