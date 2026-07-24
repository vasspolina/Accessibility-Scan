import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Mobile-specific checks. Most accessibility rules are viewport-independent,
// but two big classes of problem only show up on a narrow screen: the page
// scrolling sideways because something doesn't fit (WCAG 1.4.10 Reflow), and
// tap targets too small to hit reliably with a finger (WCAG 2.5.8 Target
// Size). The renderer resizes to a phone width, lets the layout reflow, and
// captures these signals; this evaluates them.

export interface MobileSignals {
  viewportWidth: number;
  documentScrollWidth: number;
  // Elements that break out past a parent that itself fits — the true
  // culprits forcing horizontal scroll.
  overflowingElements: Array<{ selector: string; snippet: string; overflowPx: number }>;
  // Interactive elements smaller than the 24px minimum, excluding inline
  // links inside running text (which have a WCAG exception).
  smallTapTargets: Array<{ selector: string; snippet: string; width: number; height: number }>;
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables).
export function collectMobileSignalsInPage(): MobileSignals {
  function cssPath(el: Element): string {
    if (el.id) return `#${el.id}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let selector = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const tag = node.tagName;
        const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
        if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(selector);
      node = parent;
    }
    return parts.join(" > ");
  }

  // Strip class/style/data-* before truncating. On a utility-CSS site a single
  // class attribute is hundreds of characters, so a raw outerHTML slice throws
  // away exactly what identifies the element — its accessible name, href, and
  // text — and every finding ends up labelled a generic "Button"/"Link".
  const snippetOf = (el: Element) => {
    try {
      const clone = el.cloneNode(true) as Element;
      const strip = (node: Element) => {
        for (const attr of Array.from(node.attributes)) {
          if (/^(class|style)$/i.test(attr.name) || /^data-/i.test(attr.name)) {
            node.removeAttribute(attr.name);
          }
        }
        for (const child of Array.from(node.children)) strip(child);
      };
      strip(clone);
      return (clone.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
    } catch {
      return (el.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
    }
  };

  const vw = window.innerWidth;
  const scrollWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0
  );

  const overflowingElements: MobileSignals["overflowingElements"] = [];
  if (scrollWidth > vw + 3) {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (overflowingElements.length >= 6) break;
      if (el === document.documentElement || el === document.body) continue;
      try {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") continue; // fixed elements don't grow the document
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const overflowPx = Math.round(r.right - vw);
        if (overflowPx <= 5 || r.left >= vw) continue;
        // Report only the outermost breakout: the element overflows but its
        // parent fits within the viewport.
        const parent = el.parentElement;
        const parentFits = !parent || parent.getBoundingClientRect().right <= vw + 5;
        if (parentFits) {
          overflowingElements.push({ selector: cssPath(el), snippet: snippetOf(el), overflowPx });
        }
      } catch {
        // skip a bad element
      }
    }
  }

  const smallTapTargets: MobileSignals["smallTapTargets"] = [];
  const interactive = Array.from(
    document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select')
  );
  for (const el of interactive) {
    if (smallTapTargets.length >= 15) break;
    try {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // not visible
      // Inline links inside running text are exempt from the target-size rule.
      const inText = el.closest("p, li, span, td, dd, dt, h1, h2, h3, h4, h5, h6");
      if (el.tagName.toLowerCase() === "a" && inText) continue;
      if (r.width < 24 || r.height < 24) {
        smallTapTargets.push({
          selector: cssPath(el),
          snippet: snippetOf(el),
          width: Math.round(r.width),
          height: Math.round(r.height),
        });
      }
    } catch {
      // skip
    }
  }

  return {
    viewportWidth: vw,
    documentScrollWidth: Math.round(scrollWidth),
    overflowingElements,
    smallTapTargets,
  };
}

const FIX_HSCROLL =
  "Make the layout fit the screen: put max-width:100% on images, videos, and tables, avoid fixed pixel widths wider than the screen, and let content wrap. Test the page at 320px wide.";
const FIX_TAP =
  "Make tap targets at least 24×24px (44×44px is more comfortable), with a little space between them — add padding to the element rather than shrinking it.";

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  wcagCriterion: string,
  wcagLevel: "A" | "AA",
  selector: string,
  snippet: string,
  description: string,
  suggestedFix: string,
  helpUrl: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "accessibility",
    wcagCriterion,
    wcagLevel,
    selector,
    elementSnippet: snippet || undefined,
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

/**
 * Pure and deterministic. Returns one finding per affected element so the
 * widget groups them into "Content scrolls sideways (N)" / "Tap targets too
 * small (N)" with each element listed.
 */
export function evaluateMobile(m: MobileSignals): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  if (m.documentScrollWidth > m.viewportWidth + 5) {
    const culprits =
      m.overflowingElements.length > 0
        ? m.overflowingElements
        : [{ selector: "body", snippet: "", overflowPx: m.documentScrollWidth - m.viewportWidth }];
    for (const c of culprits) {
      findings.push(
        makeFinding(
          "mobile-horizontal-scroll",
          "serious",
          "1.4.10",
          "AA",
          c.selector,
          c.snippet,
          `On a ${m.viewportWidth}px-wide phone screen this element extends about ${c.overflowPx}px past the edge, so the whole page scrolls sideways (it renders ${m.documentScrollWidth}px wide).`,
          FIX_HSCROLL,
          "https://www.w3.org/WAI/WCAG21/Understanding/reflow.html"
        )
      );
    }
  }

  for (const t of m.smallTapTargets) {
    findings.push(
      makeFinding(
        "mobile-tap-target",
        "moderate",
        "2.5.8",
        "AA",
        t.selector,
        t.snippet,
        `On a phone this tap target is only ${t.width}×${t.height}px — smaller than the 24×24px minimum, so it's easy to miss or tap the wrong thing.`,
        FIX_TAP,
        "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html"
      )
    );
  }

  return findings;
}
