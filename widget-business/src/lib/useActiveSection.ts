import { useEffect, useState } from "react";

export interface NavTarget {
  id: string;
  el: HTMLElement;
}

/**
 * Which section heading is "current" as the report scrolls past — the
 * sidebar's highlight, not a router. Takes element references directly
 * (rather than looking ids up via `document.getElementById`) because the
 * widget renders inside a Shadow DOM, whose ids the top document can't see.
 *
 * Computed fresh from each heading's current position on every scroll,
 * rather than tracked via accumulated IntersectionObserver enter/exit
 * events. The event-based version (an observer watching a narrow band,
 * adding/removing ids from a "currently inside the band" set) had a real
 * failure mode: whichever heading last landed in the set stayed active
 * until another one visibly entered it, and a short section, or the
 * browser simply batching several scroll frames into one callback (it
 * does this for backgrounded tabs, but a fast fling risks the same),
 * could skip a heading's turn in that band entirely — the sidebar would
 * then still say "Score" while the reader sat at the bottom of the
 * report. A plain scroll listener has no history to fall out of sync
 * with: given only the current scroll position, it always finds the
 * right answer on its own, every time it runs.
 */
export function useActiveSection(targets: NavTarget[]): string | null {
  const ids = targets.map((t) => t.id);
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (targets.length === 0) {
      setActiveId(null);
      return;
    }

    // The current section is the last one whose heading has crossed this
    // far down from the viewport top.
    const threshold = () => window.innerHeight * 0.2;

    let ticking = false;
    const compute = () => {
      ticking = false;
      const line = threshold();
      let current = targets[0].id;
      for (const t of targets) {
        if (t.el.getBoundingClientRect().top <= line) {
          current = t.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return activeId;
}
