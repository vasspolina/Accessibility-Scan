import { undecidedExplanation } from "../lib/wcagPlain";

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
      <h3 className="a11y-section-title">
        Needs your eyes, not ours{" "}
        <span className="a11y-section-count">({total})</span>
      </h3>
      <p className="a11y-section-desc">
        The checker looked at {total === 1 ? "this" : `these ${total}`} and could
        not decide. That is deliberate: it reports a problem only when it can
        prove one, so anything it cannot measure comes here instead of being
        guessed at either way. None of it counts against the score, and some of
        it will turn out to be perfectly fine.
      </p>
      <ul className="a11y-undecided-list">
        {rows.map((r) => {
          const e = undecidedExplanation(r.ruleId);
          return (
            <li key={r.ruleId} className="a11y-undecided">
              <p className="a11y-undecided-head">
                <strong>
                  {r.count} {r.count === 1 ? "place" : "places"}
                </strong>{" "}
                — {e ? e.what : r.help}
              </p>
              {e && (
                <p className="a11y-undecided-do">
                  <strong>How to check:</strong> {e.youCheck}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
