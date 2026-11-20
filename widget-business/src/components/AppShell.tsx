import { PosterMark } from "./PosterMark";
import type { ReactNode, RefObject } from "react";
import { VoiceControl } from "./VoiceControl";
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
  navMeta,
  navSettings,
  mark,
  onJump,
  contentRef,
  children,
}: {
  sections: NavSection[];
  activeId: string | null;
  /* "hostname · date": the small centred line under the page's word,
     where the sheet names the event. Optional: before a report exists
     there is nothing to name. */
  navMeta?: string;
  /* The run's settings, shown in the rail under the section list. */
  navSettings?: ReactNode;
  /* The page's word at its top edge (decoration). */
  mark?: string;
  /* Shared with SideNav so the two navs cannot scroll or focus differently. */
  onJump: (el: HTMLElement) => void;
  // The content wrapper App.tsx queries for `[data-nav-label]` headings
  // after each render, to build `sections` above.
  contentRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const hasNav = sections.length > 0;
  return (
    <>
      {/* Nav and content share one grid area rather than taking a row each.
          A sticky element can only travel inside its containing block, and
          for a grid item that block is its own grid area — a nav in its own
          row is exactly as tall as itself, so `position: sticky` had nowhere
          to go and the bar scrolled away like any other element. Inside this
          wrapper its containing block is the whole report, which is the
          distance it was always meant to travel. */}
      {/* The sheet's top edge comes before everything, the rail included:
          the page's word, then the small centred line under it. */}
      {mark && <PosterMark word={mark} />}
      {navMeta && <p className="a11y-poster-line">{navMeta}</p>}
      <div className="a11y-shell-main">
        {hasNav && (
          <SideNav
            sections={sections}
            activeId={activeId}
            settings={navSettings}
            onJump={onJump}
          />
        )}
        <div className="a11y-shell-content" ref={contentRef}>
          <VoiceControl />
          {children}
        </div>
      </div>
    </>
  );
}
