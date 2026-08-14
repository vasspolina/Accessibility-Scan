import type { CSSProperties } from "react";

/**
 * RelatedChecks, ported from components/scan/RelatedChecks.jsx.
 *
 * New to this package — nothing is replaced, so nothing breaks by adding it.
 * The annotation places it at the end of a section: "closes the section with
 * two to four onward links, each with a reason."
 *
 * Each card is one <button>, which is the source's shape and the right one:
 * the card does a single thing when activated, so it is a single control,
 * and a real button brings the role, the tab stop and the keyboard handling
 * with it.
 *
 * The hover/focus inversion lives in RelatedChecks.css rather than in state
 * here; the reason, including a bug it fixes in the source, is written there.
 *
 */

export interface RelatedCheckItem {
  id: string;
  name: string;
  level: string;
  /** Why this check is related. Optional in the source's API; see below. */
  why?: string;
}

export function RelatedChecks({
  title = "Related checks",
  items,
  onOpen,
  style,
}: {
  title?: string;
  items: RelatedCheckItem[];
  onOpen?: (item: RelatedCheckItem) => void;
  style?: CSSProperties;
}) {
  /* The annotation says two to four. Rendering nothing beats rendering a
     heading over an empty grid, which is what an unguarded map would do. */
  if (items.length === 0) return null;

  return (
    <section className="a11y-related" style={style}>
      {/* An h3: these close a section whose own heading is an h2, so this is
          the level that keeps the outline intact. Fixed rather than a prop,
          for the same reason Card's title is — heading order is the one
          thing a component like this can quietly break. */}
      <h3 className="a11y-related-title">{title}</h3>
      <div className="a11y-related-grid">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className="a11y-related-card"
            onClick={() => onOpen?.(it)}
          >
            <span className="a11y-related-meta">
              {it.id} · Level {it.level}
            </span>{" "}
            <span className="a11y-related-name">{it.name}</span>
            {/* `why` is what makes this a recommendation rather than a list
                of homework — "Often fails wherever contrast does" is the
                reason someone would open it, where a bare criterion number
                is not. Optional in the source's API; every call site here
                should pass one. */}
            {it.why && <span className="a11y-related-why">{it.why}</span>}
            <span className="a11y-related-spacer" aria-hidden="true" />
            <span className="a11y-related-open">
              Open the check
              {/* aria-hidden: the arrow repeats what "Open" already says, and
                  a screen reader reading both announces "…, north east
                  arrow". The button's name is the whole card text, which
                  already identifies which check it opens. */}
              <span aria-hidden="true"> ↗</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
