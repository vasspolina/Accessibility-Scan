import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../Icon";

/**
 * The card.
 *
 * A <section>. A section with no accessible name is
 * not a landmark, so this adds nothing to the landmark list and needs no
 * label. Changing it to a div would be a silent structural change for no
 * gain.
 *
 * The optional title renders an <h3>, which is what the call sites expect to
 * sit under their section's own <h2>. Heading order is the one thing this
 * component can break, so the level stays fixed rather than becoming a prop
 * somebody could set wrongly.
 *
 * `style` is accepted. Two call sites pass layout through it — a fixed
 * tile width, a transparent fill.
 *
 */

/**
 * `eyebrow`, `meta` and the trailing link had
 * no equivalent in the version this replaces; the CSS for them is written.
 *
 * `tone="invert"` is the black panel — an eyebrow, a
 * statement and an action, reversed out. It is the strongest device the card
 * has, so it is worth having available rather than rebuilt ad hoc.
 */
export type CardTone = "default" | "invert";

export function Card({
  tone = "default",
  eyebrow,
  title,
  meta,
  linkLabel,
  href,
  onLinkClick,
  children,
  style,
}: {
  tone?: CardTone;
  eyebrow?: string;
  title?: string;
  meta?: string;
  linkLabel?: string;
  href?: string;
  onLinkClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`a11y-card${tone === "invert" ? " a11y-card-emphasis" : ""}`}
      style={style}
    >
      {eyebrow && <div className="a11y-card-eyebrow">{eyebrow}</div>}
      {title && <h3 className="a11y-card-title">{title}</h3>}
      {meta && <div className="a11y-card-meta">{meta}</div>}
      {children && <div className="a11y-card-body">{children}</div>}
      {linkLabel && (
        <a
          className="a11y-card-link"
          href={href || "#"}
          onClick={onLinkClick}
        >
          {linkLabel}
          {/* aria-hidden: the arrow repeats what the link text already says,
              and a screen reader reading both announces "…, north east
              arrow". Same rule the report applies to other sites. */}
          {" "}<Icon name="launch" />
        </a>
      )}
    </section>
  );
}
