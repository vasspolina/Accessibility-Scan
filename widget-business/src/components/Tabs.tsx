import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * The tab strip, brought across from the kit.
 *
 * The first component in this stage that genuinely implements behaviour the
 * platform does not give you, so it is copied exactly and then tested by
 * driving it rather than by reading it.
 *
 * Four things have to survive, and each fails silently if it does not:
 *
 *   Roving tabindex. Exactly one tab is in the tab order (0) and the rest
 *   are -1. Without it, tabbing through a strip of six tabs takes six
 *   presses to get past something that should take one.
 *
 *   Arrow keys move focus AND selection together, wrapping at both ends.
 *   That is what the roving tabindex is for: once inside the strip, arrows
 *   are how you move, and Tab is how you leave.
 *
 *   preventDefault on the arrows, or the page scrolls under the reader
 *   while they are choosing a tab.
 *
 *   The pairing: each tab's aria-controls names its panel, and the panel's
 *   aria-labelledby names the tab back. Broken in either direction and a
 *   screen reader cannot say which panel it is in.
 *
 * The panel keeps tabIndex 0 so a keyboard reader can enter content that
 * may not contain any focusable element of its own.
 */

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function Tabs({
  items = [],
  defaultId,
  onChange,
  panelOwns,
}: {
  items?: TabItem[];
  defaultId?: string;
  onChange?: (id: string) => void;
  panelOwns?: string;
}) {
  const [active, setActive] = useState(defaultId || (items[0] && items[0].id));
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const go = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = items[(i + d + items.length) % items.length];
    go(n.id);
    refs.current[n.id]?.focus();
  };

  const cur = items.find((it) => it.id === active);

  return (
    <div className="a11y-tabs">
      <div className="a11y-tablist" role="tablist">
        {items.map((it, i) => (
          <button
            key={it.id}
            role="tab"
            id={`tab-${it.id}`}
            className="a11y-tab"
            aria-selected={it.id === active}
            aria-controls={`panel-${it.id}`}
            tabIndex={it.id === active ? 0 : -1}
            ref={(el) => {
              refs.current[it.id] = el;
            }}
            onClick={() => go(it.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.label}
          </button>
        ))}
      </div>
      {cur && (
        <div
          role="tabpanel"
          id={`panel-${cur.id}`}
          className="a11y-tabpanel"
          aria-labelledby={`tab-${cur.id}`}
          tabIndex={0}
          aria-owns={panelOwns || undefined}
        >
          {cur.panel}
        </div>
      )}
    </div>
  );
}
