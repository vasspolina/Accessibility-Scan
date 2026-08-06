/**
 * The embedder's plans, across the top of the report.
 *
 * Every word and number here comes from the host page's own configuration.
 * Nothing is invented and nothing is defaulted: no plans configured, no bar,
 * because a made-up price on somebody's live site is worse than no bar at
 * all — and this widget is embedded on other people's sites, where an
 * invented figure is their problem, not ours.
 *
 * It also stays out of the report's own voice. The report is a factual
 * document about a page, and this is a sales row above it; keeping them
 * visibly separate is the point of the divider and of the "advertisement"
 * label a screen reader gets, which says what the row is before it reads
 * three prices.
 */

export interface Plan {
  name: string;
  price: string;
  href: string;
  /** One plan may be lifted, as the reference lifts its middle tier. */
  featured?: boolean;
  /** Optional line under the price — "per year", "billed monthly". */
  note?: string;
}

export function PlansBar({ plans }: { plans?: Plan[] }) {
  if (!plans || plans.length === 0) return null;

  return (
    <aside className="a11y-plans-bar" aria-label="Advertisement">
      <ul className="a11y-plans-list">
        {plans.map((plan) => (
          <li
            key={plan.name + plan.href}
            className={`a11y-plan${plan.featured ? " a11y-plan-featured" : ""}`}
          >
            <span className="a11y-plan-name">{plan.name}</span>
            <span className="a11y-plan-price">
              {plan.price}
              {plan.note && <span className="a11y-plan-note"> {plan.note}</span>}
            </span>
            {/* Opens away from the report, like every other outbound link
                here, and carries the plan's name in its accessible name —
                three buttons all reading "Buy now" is a screen-reader
                failure this report files against other people's sites. */}
            <a
              className="a11y-plan-buy"
              href={plan.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buy now
              <span className="a11y-sr-only"> — {plan.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
