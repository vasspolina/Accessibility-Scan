import { useId, useState } from "react";
import type { NavTarget } from "../lib/useActiveSection";

export interface NavSection extends NavTarget {
  label: string;
}

/**
 * The shell's jump list, in Google's Material Design 3 language rather
 * than the report's own Carbon-derived kit — a deliberate one-off, per
 * request, styled against a Material nav-rail reference (Google Drive's
 * sidebar): a tonal surface with no hairline border, and the current
 * section carried by a full pill fill rather than Carbon's square card +
 * left-border accent. `.a11y-shell-nav*` in styles.css defines the
 * Material color roles and shape tokens this reads from, scoped to this
 * component so the rest of the report's Carbon tokens are untouched.
 *
 * The links stay real `<a>` elements rather than a Material-flavoured
 * Button: nothing in this app's Button can forward `href`, `aria-current`,
 * or a ref, so it can't be a real link, can't carry current-section state,
 * and can't be the target `document.activeElement` checks land on.
 *
 * A bare `href="#id"` doesn't reliably scroll inside a Shadow DOM fragment
 * (and `document.getElementById` can't even see the target), so the click
 * handler scrolls the element it already has a reference to — the same
 * scroll-then-focus pattern App.tsx's own `focusForm` already uses.
 *
 * Below the shell's mobile breakpoint, this collapses to a hamburger
 * toggle instead of a persistent list — a phone-width column had no room
 * to keep every section label on screen at once, and letting them wrap
 * or fall back to a row of pills (both tried earlier) still cost more
 * vertical space above the report than a report on a phone can spare.
 * The `open` state only matters at that width; the CSS for the toggle
 * button and the collapse is itself scoped to the same breakpoint, so
 * this component doesn't need to know which width it's currently at.
 */
export function SideNav({
  sections,
  activeId,
  meta,
  settings,
  onJump,
}: {
  sections: NavSection[];
  activeId: string | null;
  /* The run's settings, rendered under the section list. */
  settings?: React.ReactNode;
  /* Shared with TopNav, so a jump from either lands the same way. */
  onJump: (el: HTMLElement) => void;
  /* What was scanned and when — "stedelijk.nl · 8 Aug 2026". Footed under
     the list because the rail is the one thing on screen at every scroll
     position, so it is where "which report am I in" belongs. */
  meta?: string;
}) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  const headingId = useId();

  const go = (target: HTMLElement) => (e: React.MouseEvent) => {
    e.preventDefault();
    onJump(target);
  };

  return (
    /* Labelled BY the visible heading rather than with aria-label: the
       heading is on screen now, and a landmark whose name matches what a
       sighted user reads is one fewer thing that can drift apart. */
    <nav className="a11y-shell-nav a11y-shell-nav-material" aria-labelledby={headingId}>
      {/* The card's header IS the disclosure control — there is no separate
          toggle pill. A tinted card whose only content was a white pill was
          a bubble inside a bubble, and at narrow widths that pill was the
          whole nav.

          Heading wraps button, which is the disclosure pattern: the button
          carries the state, the h2 keeps the section in the heading order.
          Open by default, and the same control at every width — a list you
          can put away is useful on a wide screen too, and one behaviour is
          easier to trust than two. */}
      <h2 className="a11y-shell-nav-head">
        <button
          type="button"
          className="a11y-shell-nav-toggle"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="a11y-shell-nav-heading" id={headingId}>
            Sections
          </span>
          <span className="a11y-shell-nav-count">
            {sections.length} {sections.length === 1 ? "section" : "sections"} in
            this report
          </span>
        </button>
      </h2>
      <ul id={listId} data-open={open}>
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="a11y-shell-nav-link"
              aria-current={activeId === s.id ? "true" : undefined}
              onClick={go(s.el)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      {settings}
      {meta && <p className="a11y-shell-nav-meta">{meta}</p>}
    </nav>
  );
}
