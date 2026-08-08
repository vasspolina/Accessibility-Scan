import { undecidedExplanation } from "../lib/wcagPlain";
import { fixKindForRule } from "../lib/testMethod";
import { DataTable } from "./DataTable";

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
      {/* h2: this is a top-level section of the report, same as its siblings. */}
      <h2 className="a11y-section-title" id="a11y-undecided-heading" data-nav-label="For your designer and developer">
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
      {rows.length > 0 && (
        /* A list, not a table. It was a one-column DataTable, which meant
           the cards it renders as could only be laid out side by side by
           giving table elements a grid display — and that quietly took the
           table role out of the accessibility tree. A <ul> is what this
           always was: a set of notes in no particular relation to each
           other. Now the semantics and the layout agree instead of one
           being undone by the other. */
        <ul className="a11y-undecided-table" aria-label="What the checker couldn't decide">
          {rows.map((r) => {
            const e = undecidedExplanation(r.ruleId);
            const fix = fixKindForRule(r.ruleId);
            return (
              <li key={r.ruleId} className="a11y-undecided-cell">
                <span className="a11y-undecided-badge-row">
                  <span className={`a11y-method-badge a11y-fix-${fix.key}`}>{fix.label}</span>
                  <span className="a11y-undecided-places">
                    {r.count} {r.count === 1 ? "place" : "places"}
                  </span>
                </span>
                <p className="a11y-undecided-what">{e ? e.what : r.help}</p>
                {e && (
                  <p className="a11y-undecided-ask">
                    <strong>What to ask for:</strong> {e.ask}
                  </p>
                )}
                {r.helpUrl && (
                  <p>
                    <a
                      className="a11y-learn-more"
                      href={r.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more about this check <span aria-hidden="true">↗</span>
                    </a>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
