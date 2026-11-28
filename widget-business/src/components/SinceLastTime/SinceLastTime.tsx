import type { ReactNode } from "react";

/**
 * SinceLastTime.
 *
 * The styling is in SinceLastTime.css, in the tree's one token vocabulary,
 * with no alias layer.
 *
 * One choice has to be flagged rather than buried. There is no tertiary
 * on-inverse ink. The four places that would take one use
 * --content-on-inverse-secondary rather than a
 * light-ground grey: the grey puts #5c554b on #23201d at 1.8:1.
 *
 * Not yet wired. The app's ScanHistory owns the real comparison data — this is
 * the shape it should take, not a replacement for it.
 *
 */

export function Stat({
  n,
  title,
  caption,
  badge,
  badgeTone,
  invert,
}: {
  n: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  badge?: ReactNode;
  /** Any CSS colour. Defaults to the accent surface. */
  /** A tone NAME (e.g. "better", "worse"), never a colour. */
  badgeTone?: string;
  invert?: boolean;
}) {
  return (
    <div className={"a11y-slt-stat" + (invert ? " a11y-slt-stat-invert" : "")}>
      <div className="a11y-slt-stat-head">
        <span className="a11y-slt-stat-caption">{caption}</span>
        {badge && (
          <span
            className="a11y-slt-stat-badge"
            /* Converted, not deleted: this was an inline background taking a
               colour straight from a prop, which is the reintroduce-colours-
               as-props anti-pattern the earlier strips removed elsewhere. The
               tone is a NAME now and the stylesheet decides what it looks
               like. Same treatment as data-row-state and data-align. */
            data-tone={badgeTone}
          >
            {badge}
          </span>
        )}
      </div>
      <span>
        <span className="a11y-slt-stat-n">{n}</span>{" "}
        <span className="a11y-slt-stat-title">{title}</span>
      </span>
    </div>
  );
}

export function SinceLastTime({
  comparedWith,
  earlierScans,
  verdict,
  lead,
  onCompareAnother,
  children,
}: {
  comparedWith: string;
  earlierScans: string;
  verdict: string;
  lead?: ReactNode;
  onCompareAnother?: () => void;
  /** The Stat cards. Kept a slot so the caller decides what is worth counting. */
  children?: ReactNode;
}) {
  return (
    <div className="a11y-slt">
      <section className="a11y-slt-band">
        <div className="a11y-slt-meta">
          <span className="a11y-slt-eyebrow">Since last time</span>{" "}
          <span className="a11y-slt-compared">{comparedWith}</span>{" "}
          <span className="a11y-slt-earlier">{earlierScans}</span>
          {onCompareAnother && (
            <button type="button" className="a11y-slt-action" onClick={onCompareAnother}>
              Compare another scan
            </button>
          )}
        </div>
        {/* The verdict as display type. The example — "Nothing moved
            since 2 August." — is a sentence, not a number, which is the whole
            point of the screen: it answers before you read the cards. */}
        <h2 className="a11y-slt-verdict">{verdict}</h2>
        {lead && <p className="a11y-slt-lead">{lead}</p>}
      </section>
      <div className="a11y-slt-grid">{children}</div>
    </div>
  );
}
