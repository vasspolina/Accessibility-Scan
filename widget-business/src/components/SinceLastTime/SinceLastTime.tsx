import type { ReactNode } from "react";

/**
 * SinceLastTime, ported from ui_kits/scan-app/SinceLastTime.jsx.
 *
 * The kit's screens are inline-styled and speak the design system's older token
 * vocabulary. Both change here: the styling moves to SinceLastTime.css, and
 * every token is rewritten to Foundations v2 — no alias layer, so v2 stays the
 * only vocabulary in this tree.
 *
 * One substitution has to be flagged rather than buried. The kit reaches for
 * --text-on-invert-tertiary four times, and v2 has no tertiary on-inverse ink.
 * Each one maps UP to --content-on-inverse-secondary rather than down to a
 * light-ground grey, which is the same call every previous port has made and
 * for the same reason: mapping down puts #5c554b on #23201d at 1.8:1.
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
  /** Any CSS colour. Defaults to the accent surface, as the kit does. */
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
            style={badgeTone ? { background: badgeTone } : undefined}
          >
            {badge}
          </span>
        )}
      </div>
      <span>
        <span className="a11y-slt-stat-n">{n}</span>
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
          <span className="a11y-slt-eyebrow">Since last time</span>
          <span className="a11y-slt-compared">{comparedWith}</span>
          <span className="a11y-slt-earlier">{earlierScans}</span>
          {onCompareAnother && (
            <button type="button" className="a11y-slt-action" onClick={onCompareAnother}>
              Compare another scan
            </button>
          )}
        </div>
        {/* The verdict as display type. The kit's example — "Nothing moved
            since 2 August." — is a sentence, not a number, which is the whole
            point of the screen: it answers before you read the cards. */}
        <h2 className="a11y-slt-verdict">{verdict}</h2>
        {lead && <p className="a11y-slt-lead">{lead}</p>}
      </section>
      <div className="a11y-slt-grid">{children}</div>
    </div>
  );
}
