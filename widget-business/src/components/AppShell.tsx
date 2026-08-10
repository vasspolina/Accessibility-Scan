import type { ReactNode, RefObject } from "react";
import { SideNav, type NavSection } from "./SideNav";
import { TopNav } from "./TopNav";
import { PlansBar, type Plan } from "./PlansBar";

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
  navMeta,
  navSettings,
  topActions,
  onJump,
  plans,
  contentRef,
  children,
}: {
  sections: NavSection[];
  activeId: string | null;
  /* "hostname · date" for the nav's footer. Optional: before a report
     exists there is nothing to name. */
  navMeta?: string;
  /* The run's settings, shown in the rail under the section list. */
  navSettings?: ReactNode;
  /* The top bar's run controls. */
  topActions?: ReactNode;
  /* Shared with SideNav so the two navs cannot scroll or focus differently. */
  onJump: (el: HTMLElement) => void;
  /* The embedder's plans, if they configured any. Rendered above the nav
     and nowhere else, so the report below it stays one continuous
     document. */
  plans?: Plan[];
  // The content wrapper App.tsx queries for `[data-nav-label]` headings
  // after each render, to build `sections` above.
  contentRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const hasNav = sections.length > 0;
  return (
    <>
      <header className="a11y-shell-header">
        <TopNav
          sections={sections}
          activeId={activeId}
          actions={topActions}
          onJump={onJump}
        />
        <PlansBar plans={plans} />
      </header>
      {/* Nav and content share one grid area rather than taking a row each.
          A sticky element can only travel inside its containing block, and
          for a grid item that block is its own grid area — a nav in its own
          row is exactly as tall as itself, so `position: sticky` had nowhere
          to go and the bar scrolled away like any other element. Inside this
          wrapper its containing block is the whole report, which is the
          distance it was always meant to travel. */}
      <div className="a11y-shell-main">
        {hasNav && (
          <SideNav
            sections={sections}
            activeId={activeId}
            meta={navMeta}
            settings={navSettings}
            onJump={onJump}
          />
        )}
        <div className="a11y-shell-content" ref={contentRef}>
          {children}
        </div>
      </div>
    </>
  );
}
