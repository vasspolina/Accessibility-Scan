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

export type TagTone = "gray" | "blue" | "red" | "green";

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
