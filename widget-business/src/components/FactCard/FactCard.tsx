import type { CSSProperties, ReactNode } from "react";

/**
 * FactCard, ported from components/display/FactCard.jsx.
 *
 * A label, one display-size number, and an optional note. This is the first
 * component in the port that the app does not already have — nothing is
 * being replaced, so nothing breaks by adding it, and no call site changes
 * until somebody deliberately adopts it.
 *
 * A <section>, as the source has it, and as Card is. No accessible name, so
 * it adds nothing to the landmark list and needs no label.
 *
 * `value` is deliberately not typed as a number. The source allows any node,
 * and the report has facts that are not integers — "63 of 210", "4.5:1",
 * "none". Narrowing it here would make the component less useful than the
 * one it was ported from.
 *
 */

/**
 * Three tones. The annotation is explicit that accent is rationed: "at most
 * one accent card per row", and "a row of six accent cards competing for
 * attention" is named as the anti-pattern. That is a composition rule, so it
 * cannot be enforced by a component that only ever sees itself — it belongs
 * in the rules file and in review.
 */
export type FactCardTone = "default" | "accent" | "invert";

export function FactCard({
  label,
  value,
  note,
  tone = "default",
  children,
  style,
}: {
  label: string;
  value?: ReactNode;
  note?: ReactNode;
  tone?: FactCardTone;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const toneClass =
    tone === "accent"
      ? " a11y-fact-accent"
      : tone === "invert"
        ? " a11y-fact-invert"
        : "";

  return (
    <section className={`a11y-fact${toneClass}`} style={style}>
      <span className="a11y-fact-label">{label}</span>
      {children}
      {/* `!= null` rather than a truthiness check: a fact card showing 0 —
          "0 critical findings" — is the best result this report can print,
          and `value && …` would silently drop it. */}
      {value != null && (
        <div className="a11y-fact-value-row">
          <span className="a11y-fact-value">{value}</span>
        </div>
      )}
      {note && <span className="a11y-fact-note">{note}</span>}
    </section>
  );
}
