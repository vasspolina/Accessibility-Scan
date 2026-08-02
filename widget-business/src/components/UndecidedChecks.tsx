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
    <section className="a11y-section">
      {/* h2: this is a top-level section of the report, same as its siblings. */}
      <h2 className="a11y-section-title">
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
        <div className="a11y-findings-columns" aria-hidden="true">
          <span>What we couldn&rsquo;t decide</span>
        </div>
      )}
      <ul className="a11y-undecided-list a11y-findings-list">
        {rows.map((r) => {
          const e = undecidedExplanation(r.ruleId);
          const fix = fixKindForRule(r.ruleId);
          return (
            <li key={r.ruleId} className="a11y-undecided">
              {/* A kicker over the row's own content, not a column beside it:
                  unlike severity, "who fixes this" isn't a value worth
                  scanning down on its own — it belongs to the sentence it
                  labels. */}
              <span className={`a11y-method-badge a11y-fix-${fix.key} a11y-undecided-fix`}>
                {fix.label}
              </span>
              <div className="a11y-undecided-body">
                <p className="a11y-undecided-head">
                  <strong>
                    {r.count} {r.count === 1 ? "place" : "places"}
                  </strong>{" "}
                  — {e ? e.what : r.help}
                </p>
                {e && (
                  <p className="a11y-undecided-do">
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
                      Learn more about this check ↗
                    </a>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
