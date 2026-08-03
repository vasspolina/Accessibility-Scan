import { DataTable } from "@verify/design-system";
import { undecidedExplanation } from "../lib/wcagPlain";
import { fixKindForRule } from "../lib/testMethod";

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
      <p className="a11y-section-desc">
        The checker could not settle {total === 1 ? "this one" : `these ${total}`}{" "}
        on its own, and that is deliberate: it reports a problem only where it
        can prove one, so anything that needs judgement comes here rather than
        a guess either way. Each is a decision for somebody on your
        side — the mark on every one says whose. None of it counts against the
        score, and some of it will turn out to be perfectly fine.
      </p>
      {rows.length > 0 && (
        <div className="a11y-undecided-table">
        <DataTable
          caption="What the checker couldn't decide"
          headers={[
            { key: "fix", label: "Who fixes this", width: "1%" },
            { key: "issue", label: "What we couldn't decide" },
            { key: "places", label: "Places", align: "right", width: "1%" },
          ]}
          rows={rows.map((r) => {
            const e = undecidedExplanation(r.ruleId);
            const fix = fixKindForRule(r.ruleId);
            return {
              id: r.ruleId,
              cells: [
                <span key="fix" className={`a11y-method-badge a11y-fix-${fix.key}`}>
                  {fix.label}
                </span>,
                <div key="issue" className="a11y-undecided-cell">
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
                </div>,
                String(r.count),
              ],
            };
          })}
        />
        </div>
      )}
    </section>
  );
}
