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
 */
export function SideNav({ sections, activeId }: { sections: NavSection[]; activeId: string | null }) {
  const go = (target: HTMLElement) => (e: React.MouseEvent) => {
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  return (
    <nav className="a11y-shell-nav a11y-shell-nav-material" aria-label="Report sections">
      <ul>
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
    </nav>
  );
}
