import { useId, useState } from "react";
import type { CSSProperties } from "react";

/**
 * The readiness panel, brought across from the kit.
 *
 * A disclosure and nothing more: one button, aria-expanded, a list that
 * appears. No focus trap and no roving focus, which is what separates it
 * from the three components still in the kit.
 *
 * One deliberate difference from the copy. The kit's button carries
 * aria-expanded but nothing saying *what* it expands; this adds
 * aria-controls pointing at the list. A screen reader can then take the
 * reader to the thing that just opened instead of leaving them to find it.
 * It is the one place in this stage where owning a component was worth
 * more than reproducing it exactly, and it is safe because the id is
 * generated per instance rather than assumed unique by hand.
 *
 * Quieter than the severity chips by design: nothing it reports is a
 * requirement yet, so it never borrows the error or warning colour roles.
 * The one exception is the fail count, which describes today rather than
 * the future and is allowed to look like it.
 */
export function WhatsNextPanel({
  eyebrow = "What's next",
  standard,
  expected,
  failCount = 0,
  description,
  items = [],
  defaultOpen = false,
  style,
}: {
  eyebrow?: string;
  standard: string;
  expected: string;
  failCount?: number;
  description: string;
  items?: Array<{ criterion: string; title: string; level: string }>;
  defaultOpen?: boolean;
  /* Kept for the same reason Card keeps it: the call site passes spacing
     through, and this stage moves components without rewriting screens. */
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const listId = useId();

  return (
    <section className="a11y-next" style={style}>
      <div className="a11y-next-eyebrow">{eyebrow}</div>
      <button
        type="button"
        className="a11y-next-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="a11y-next-standard">
          <strong>{standard} </strong>
          <span>{expected}</span>
        </span>
        {failCount > 0 && (
          <span className="a11y-next-count">{failCount} would fail today</span>
        )}
        <span className="a11y-next-chevron" aria-hidden="true" data-open={open}>
          ⌄
        </span>
      </button>
      <p className="a11y-next-desc">{description}</p>
      {/* Always in the DOM so aria-controls always points at something real;
          hidden rather than unmounted, which is also what lets the print
          stylesheet reveal it. */}
      <ul className="a11y-next-list" id={listId} hidden={!open || items.length === 0}>
        {items.map((it) => (
          <li key={it.criterion}>
            <span className="a11y-next-crit">{it.criterion}</span>
            <span className="a11y-next-title">{it.title}</span>
            <span className="a11y-next-level">{it.level}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
