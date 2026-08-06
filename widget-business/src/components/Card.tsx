import type { CSSProperties, ReactNode } from "react";

/**
 * The card, brought across from the kit.
 *
 * A <section> as the kit had it. A section with no accessible name is not a
 * landmark, so this adds nothing to the landmark list and needs no label —
 * changing it to a div would be a silent structural change for no gain.
 *
 * The optional title renders an <h3>, which is what the call sites expect to
 * sit under their section's own <h2>. Heading order is the one thing this
 * component can break, so the level stays fixed rather than becoming a prop
 * somebody could set wrongly.
 *
 * `style` survives the move. Two call sites pass layout through it — a fixed
 * tile width, a transparent fill — and the point of this stage is to own the
 * component without rewriting the screens that use it.
 */
export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className="a11y-card" style={style}>
      {title && <h3 className="a11y-card-title">{title}</h3>}
      {children}
    </section>
  );
}
