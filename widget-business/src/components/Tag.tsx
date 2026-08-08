import type { ReactNode } from "react";

/**
 * The tone chip and the count badge, brought across from the kit.
 *
 * Both are presentational — no focus, no state, no ARIA beyond the one label
 * Badge carries and which is the reason it needs its own component at all.
 *
 * Badge's `label` is not decoration. The chip renders a bare number, and a
 * bare number read aloud is "twelve" with no clue what twelve counts, so the
 * accessible name spells it out: "12 findings". Kept exactly as the kit had
 * it, including the rule that no label means no aria-label rather than an
 * empty one — an aria-label of "12 " would be worse than none.
 */

/* All nine tones the annotation lists. Four — magenta, purple, cyan, teal —
   had no equivalent here before; their token pairs were already bridged, so
   only the names were missing. A tone the design system has and the code does
   not is how the two drift apart, even when nothing reaches for it yet.
   "accent" is the odd one out: white on the ember fill at 6.68:1, and the
   only tone that is not a Carbon tag pair. */
export type TagTone =
  | "gray"
  | "red"
  | "magenta"
  | "purple"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "accent";

export function Tag({ tone = "gray", children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={`a11y-tag a11y-tag-${tone}`}>{children}</span>;
}

export function Badge({ count, label }: { count: number | string; label?: string }) {
  return (
    <span className="a11y-count-chip" aria-label={label ? `${count} ${label}` : undefined}>
      {count}
    </span>
  );
}
