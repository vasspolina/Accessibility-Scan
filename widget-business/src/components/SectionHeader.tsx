import { t } from "../lib/strings";
import type { ReactNode } from "react";

/**
 * The section anatomy the design kit's composed screens all agree on
 * (`ui_kits/scan-app/ReportSections.jsx` factors it as `Section`; Perceivable,
 * TrustIssues and DesignNotes follow the same shape):
 *
 *   EYEBROW
 *   Title <qualifier>            [status chip] [action]
 *   ───────────────────────────────────────────────────
 *
 * Rendered as markup rather than imported, because the kit's `Section` is a
 * screen-local helper rather than a published component — there is nothing in
 * `@verify/design-system` to import for it.
 *
 * The eyebrow is presentation, not structure: it names the category a reader
 * already sees in the heading, so it stays outside the `<h2>` rather than
 * being read as part of it.
 */
export function SectionHeader({
  eyebrow,
  title,
  qualifier,
  chip,
  action,
  id,
  navLabel,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Secondary, weight 400, inline after the title — "16 announcements". */
  qualifier?: ReactNode;
  /** A `<StatusChip>`; the kit right-aligns it with the action. */
  chip?: ReactNode;
  action?: ReactNode;
  id?: string;
  /** Short label for the app-shell sidebar, when this heading is one of its
      jump targets. `title` is often a full sentence with a live count baked
      in ("Issues that could turn away users (2)") — the nav wants the
      plain, stable name instead. */
  navLabel?: string;
}) {
  return (
    <div className="a11y-section-head">
      <div className="a11y-section-head-text">
        {/* Translated here rather than at each call site: every section that
            uses this header gets its language for free, and the heading and
            its rail label resolve through the same dictionary, so the two
            can never end up in different languages. `title` may be JSX —
            only a plain string can be looked up. */}
        {eyebrow && <span className="a11y-section-eyebrow">{t(eyebrow)}</span>}
        <h2 className="a11y-section-title" id={id} data-nav-label={navLabel ? t(navLabel) : undefined}>
          {typeof title === "string" ? t(title) : title}
          {qualifier && <span className="a11y-section-count"> {qualifier}</span>}
        </h2>
      </div>
      {(chip || action) && (
        <div className="a11y-section-head-aside">
          {chip}
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * The kit's status chip: square (never a pill — pills are for severity tags),
 * 24px tall, a tint behind ink of the same hue.
 *
 * `tone="critical"` is the only tone the kit uses for these, and it always
 * carries a word that says what the number means ("1 would fail today"), so
 * the colour is never the only carrier.
 */
export function StatusChip({
  tone = "critical",
  children,
}: {
  tone?: "critical" | "neutral";
  children: ReactNode;
}) {
  return <span className={`a11y-status-chip a11y-status-chip-${tone}`}>{children}</span>;
}
