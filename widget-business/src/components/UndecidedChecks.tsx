import { undecidedExplanation } from "../lib/wcagPlain";
import { fixKindForRule } from "../lib/testMethod";
import { DataTable } from "./DataTable";

/* The design's "Export the list" made real. A CSV, because this section is
   the one the owner hands to someone else: it opens in whatever spreadsheet
   the designer or developer already lives in, one row per check, and the
   columns are the ledger's own. The leading BOM is for Excel, which
   otherwise reads UTF-8 as Latin-1 and mangles the em dashes. */
function exportCsv(rows: Array<{ ruleId: string; count: number; help: string }>) {
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [["No", "What the checker saw", "What to ask for", "Call", "Places"]];
  rows.forEach((r, i) => {
    const e = undecidedExplanation(r.ruleId);
    const fix = fixKindForRule(r.ruleId);
    lines.push([String(i + 1), e ? e.what : r.help, e ? e.ask : "", fix.label, String(r.count)]);
  });
  const csv = "﻿" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "for-your-designer-and-developer.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * What the engine checked and could not settle.
 *
 * Kept out of the findings list on purpose. A finding is a fault this report
 * is willing to state; these are the cases the engine refuses to state, which
 * is precisely how its other answers stay trustworthy. Mixing them in would
 * import the false positives that discipline exists to prevent, and inflate a
 * count the score is built from.
 *
 * Leaving them out entirely was worse. A page with ninety-five undecided
 * contrast pairs looked exactly like a page with none.
 */
export function UndecidedChecks({
  rows,
}: {
  rows: Array<{ ruleId: string; count: number; help: string; helpUrl?: string }>;
}) {
  const total = rows.reduce((n, r) => n + r.count, 0);
  return (
    <section className="a11y-section" aria-labelledby="a11y-undecided-heading">
      {/* The head is wrapped, and that wrapper is load-bearing. The section is
          a two-column grid, and grid rows are shared between columns: with the
          title and these paragraphs as loose siblings, one tall item in the
          content column made row 1 tall and pushed the paragraphs below it —
          measured at 2,200px below their own heading. A wrapper makes the head
          a single grid item, so the two columns flow independently. */}
      <div className="a11y-section-head">
      {/* h2: this is a top-level section of the report, same as its siblings. */}
      <h2 className="a11y-section-title" id="a11y-undecided-heading" data-nav-label="Designer and developer">
        For your designer and developer{" "}
        <span className="a11y-section-count">({total})</span>
      </h2>
      {/* Two paragraphs, not one. This was a single seventy-one word block of
          five sentences, which is the longest thing in the report and sits at
          the top of a section — the worst place to ask someone to work for it.
          The split is where the subject changes: what the checker did, then
          what it means for the reader. */}
      <p className="a11y-section-desc">
        The checker could not settle {total === 1 ? "this one" : `these ${total}`}{" "}
        on its own. It reports a problem only where it can prove one, so
        anything needing judgement comes here rather than a guess either way.
      </p>
      <p className="a11y-section-desc">
        Each is a decision for someone on your side, and the mark on each one
        says whose. None of it counts against the score, and some will turn out
        to be perfectly fine.
      </p>
      </div>
      {rows.length > 0 && (
        /* A list, not a table. It was a one-column DataTable, which meant
           the cards it renders as could only be laid out side by side by
           giving table elements a grid display — and that quietly took the
           table role out of the accessibility tree. A <ul> is what this
           always was: a set of notes in no particular relation to each
           other. Now the semantics and the layout agree instead of one
           being undone by the other. */
        /* The design's ledger: numbered rows under NO / WHAT THE CHECKER SAW /
           WHAT TO ASK FOR / CALL. An <ol>, because the design numbers the
           rows and an order implies an <ol> — the numbers are drawn by us so
           the column header can sit over them, but the semantics agree. The
           header strip is aria-hidden: a list has no real columns, and each
           cell carries its own label for a listener. */
        <div className="a11y-undecided-ledger">
          <p className="a11y-undecided-heads" aria-hidden="true">
            <span>No</span>
            <span>What the checker saw</span>
            <span>What to ask for</span>
            <span>Call</span>
          </p>
          <ol className="a11y-undecided-table" aria-label="What the checker couldn't decide">
            {rows.map((r, i) => {
              const e = undecidedExplanation(r.ruleId);
              const fix = fixKindForRule(r.ruleId);
              const most =
                rows.length > 1 && r.count === Math.max(...rows.map((x) => x.count)) && r.count > 1;
              return (
                <li key={r.ruleId} className="a11y-undecided-cell">
                  <span className="a11y-undecided-no" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className="a11y-undecided-what">{e ? e.what : r.help}</p>
                  {e ? (
                    <p className="a11y-undecided-ask">
                      <strong className="a11y-sr-only">What to ask for: </strong>
                      {e.ask}
                    </p>
                  ) : (
                    <span className="a11y-undecided-ask" />
                  )}
                  <span className="a11y-undecided-call">
                    <span className={`a11y-method-badge a11y-fix-${fix.key}`}>{fix.label}</span>
                    {most && <span className="a11y-undecided-most">Most places</span>}
                    <span className="a11y-undecided-places">
                      {r.count} {r.count === 1 ? "place" : "places"}
                    </span>
                    {r.helpUrl && (
                      <a
                        className="a11y-learn-more"
                        href={r.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn more <span aria-hidden="true">↗</span>
                        <span className="a11y-sr-only"> about this check</span>
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          {/* Below the rows it exports, like the design draws it. The arrow
              is decorative; the words are the name. */}
          <button
            type="button"
            className="a11y-undecided-export"
            onClick={() => exportCsv(rows)}
          >
            Export the list <span aria-hidden="true">{"\u2192"}</span>
          </button>
        </div>
      )}
    </section>
  );
}
