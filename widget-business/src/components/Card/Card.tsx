import type { CSSProperties, ReactNode } from "react";

/**
 * The card, ported from components/display/Card.jsx.
 *
 * A <section>, as the source has it. A section with no accessible name is
 * not a landmark, so this adds nothing to the landmark list and needs no
 * label — changing it to a div would be a silent structural change for no
 * gain.
 *
 * The optional title renders an <h3>, which is what the call sites expect to
 * sit under their section's own <h2>. Heading order is the one thing this
 * component can break, so the level stays fixed rather than becoming a prop
 * somebody could set wrongly. The source hardcodes h3 for the same reason.
 *
 * `style` survives the port. Two call sites pass layout through it — a fixed
 * tile width, a transparent fill — and rewriting those screens is not what
 * this stage is for.
 *
 */

/**
 * `eyebrow`, `meta` and the trailing link come from the source's API and had
 * no equivalent in the version this replaces. They are ported rather than
 * dropped: a prop that exists in the design system and not in the code is
 * how the two drift apart, and the CSS for them is written either way.
 *
 * `tone="invert"` is the black panel from the screenshot — an eyebrow, a
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
          <span aria-hidden="true"> ↗</span>
        </a>
      )}
    </section>
  );
}
