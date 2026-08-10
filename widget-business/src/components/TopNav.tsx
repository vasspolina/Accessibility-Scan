import type { ReactNode } from "react";
import type { NavSection } from "./SideNav";

/**
 * The design's top bar: the product as a pill, a short list of primary
 * destinations, and the run controls.
 *
 * The four destinations are a shortlist of real section ids, not a new
 * information architecture. Each entry renders only if its target is one of
 * the sections this report actually produced — "Pages" exists in a site
 * audit and nowhere else, and a link to a section that isn't on the page is
 * worse than no link. `ids` is a list because the same destination has a
 * different anchor in the two audiences: business mode's findings live under
 * a section heading, professional mode's under the findings table.
 *
 * This is a second route to places the Sections rail already lists, which is
 * the point of a top bar — the rail is the whole contents, this is the four
 * that matter. Both use the same scroll-then-focus handler, so neither can
 * behave differently from the other.
 */
const PRIMARY: { label: string; ids: string[] }[] = [
  { label: "Overview", ids: ["a11y-score-heading"] },
  { label: "Findings", ids: ["a11y-pro-findings", "a11y-accessibility-heading"] },
  { label: "Pages", ids: ["a11y-audit-pages-heading"] },
  { label: "Statement", ids: ["a11y-stmt-heading"] },
];

export function TopNav({
  sections,
  activeId,
  actions,
  onJump,
}: {
  sections: NavSection[];
  activeId: string | null;
  /* The run controls, supplied by App so this stays presentational and the
     buttons keep whatever behaviour their own mode gives them. */
  actions?: ReactNode;
  onJump: (el: HTMLElement) => void;
}) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const links = PRIMARY.map((p) => {
    const id = p.ids.find((i) => byId.has(i));
    return id ? { ...p, section: byId.get(id)! } : null;
  }).filter((l): l is NonNullable<typeof l> => l !== null);

  if (links.length === 0 && !actions) return null;

  return (
    <div className="a11y-topnav">
      <span className="a11y-topnav-brand">Accessibility scan</span>
      {links.length > 0 && (
        <nav className="a11y-topnav-links" aria-label="Report">
          {links.map((l) => (
            <a
              key={l.label}
              href={`#${l.section.id}`}
              className="a11y-topnav-link"
              aria-current={activeId === l.section.id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onJump(l.section.el);
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
      {actions && <div className="a11y-topnav-actions">{actions}</div>}
    </div>
  );
}
