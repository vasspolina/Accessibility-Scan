import type { ReactNode, RefObject } from "react";
import { SideNav, type NavSection } from "./SideNav";

/**
 * The app-shell's header/nav/content, laid into the grid areas
 * `.a11y-widget-inner` itself defines (see styles.css) — no extra wrapper
 * div, since the shell grid IS the widget's existing outer container.
 * Presentational only: the sidebar simply doesn't render before a report
 * exists, so there is never an empty nav landmark to trip over.
 */
export function AppShell({
  sections,
  activeId,
  contentRef,
  children,
}: {
  sections: NavSection[];
  activeId: string | null;
  // The content wrapper App.tsx queries for `[data-nav-label]` headings
  // after each render, to build `sections` above.
  contentRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const hasNav = sections.length > 0;
  return (
    <>
      <header className="a11y-shell-header" />
      {hasNav && <SideNav sections={sections} activeId={activeId} />}
      <div className="a11y-shell-content" ref={contentRef}>
        {children}
      </div>
    </>
  );
}
