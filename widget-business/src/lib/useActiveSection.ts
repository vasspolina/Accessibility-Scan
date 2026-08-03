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
 */
export function useActiveSection(targets: NavTarget[]): string | null {
  const ids = targets.map((t) => t.id);
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (targets.length === 0) {
      setActiveId(null);
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const topmost = ids.find((id) => visible.has(id));
        if (topmost) setActiveId(topmost);
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );
    for (const t of targets) observer.observe(t.el);
    setActiveId(ids[0]);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return activeId;
}
