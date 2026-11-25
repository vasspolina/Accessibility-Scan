import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// WCAG 1.4.10 Reflow, the vertical half: content must work in a window 256
// CSS px tall, which is a 1280 × 1024 screen zoomed to 400%. The 320px-wide
// half is measured in mobile/analyzeMobile.ts. This half catches what only a
// short window shows, in the two forms that can be proved from the page:
//
//   1. A pinned panel taller than the window that does not scroll. A cookie
//      banner or a chat panel with position: fixed, 400px tall, at 256px
//      leaves its lower part off the screen for good, because a fixed box
//      does not move when the page scrolls. When it holds controls down
//      there, nobody zoomed in can press them. That is a loss of function,
//      the criterion's own test, and it is scored.
//
//   2. Pinned bars that leave almost nothing to read through. A sticky header
//      and a fixed footer of 120px each leave 16px of a 256px window: not one
//      line of text. Under 40px left is scored (a line of body text with its
//      leading needs about that). Over half the window pinned, with more than
//      that left, is a design note: the page still works, through a slot.
//
// Measured with the page scrolled a little, so a sticky header is stuck as it
// would be while reading, and put back at the top afterwards.

export interface ReflowHeightSignals {
  viewportWidth: number;
  viewportHeight: number;
  /** Pinned (fixed or stuck sticky) boxes in view, outermost only, clipped to the window. */
  pinned: Array<{ selector: string; snippet: string; topPx: number; heightPx: number; widthPx: number }>;
  /** Fixed panels taller than the window that cannot scroll, and the controls left below its edge. */
  stuckPanels: Array<{ selector: string; snippet: string; heightPx: number; unreachable: string[] }>;
}

/** Window height the criterion names: 1024 / 400%. */
export const REFLOW_HEIGHT = 256;
/** Under this much readable window, not one line of text fits. */
const MIN_READABLE_PX = 40;

// Runs inside the page via page.evaluate: self-contained, no outer closures.
export function collectReflowHeightInPage(): ReflowHeightSignals {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cssPath = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
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
  };
  const snippetOf = (el: Element) => {
    const clone = el.cloneNode(false) as Element;
    for (const attr of ["class", "style"]) clone.removeAttribute(attr);
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    return clone.outerHTML.replace(/<\/[^>]+>$/, "").slice(0, 160) + (text ? ` ${text}` : "");
  };
  const nameOf = (el: Element) =>
    (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("value") || el.getAttribute("title") || el.tagName.toLowerCase())
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
  const visible = (el: Element, cs: CSSStyleDeclaration) => {
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  };

  const startY = window.scrollY;
  // A little way down, so a sticky header is stuck as it is while reading.
  const room = Math.max(0, document.documentElement.scrollHeight - vh);
  window.scrollTo(0, Math.min(room, 400));

  const pinnedEls: Element[] = [];
  for (const el of Array.from(document.body ? document.body.querySelectorAll("*") : [])) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (!visible(el, cs)) continue;
    if (cs.position === "sticky") {
      // Stuck means sitting at its inset edge; a sticky box in its normal
      // place scrolls with the page like anything else.
      const r = el.getBoundingClientRect();
      const top = parseFloat(cs.top);
      const bottom = parseFloat(cs.bottom);
      const stuckTop = !Number.isNaN(top) && Math.abs(r.top - top) < 2;
      const stuckBottom = !Number.isNaN(bottom) && Math.abs(vh - r.bottom - bottom) < 2;
      if (!stuckTop && !stuckBottom) continue;
    }
    if (pinnedEls.some((p) => p.contains(el))) continue;
    for (let i = pinnedEls.length - 1; i >= 0; i--) if (el.contains(pinnedEls[i])) pinnedEls.splice(i, 1);
    pinnedEls.push(el);
  }

  const pinned: ReflowHeightSignals["pinned"] = [];
  const stuckPanels: ReflowHeightSignals["stuckPanels"] = [];
  for (const el of pinnedEls) {
    const r = el.getBoundingClientRect();
    const clipped = Math.round(Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (clipped <= 0) continue;
    pinned.push({
      selector: cssPath(el),
      snippet: snippetOf(el),
      topPx: Math.round(Math.max(r.top, 0)),
      heightPx: clipped,
      widthPx: Math.round(Math.min(r.right, vw) - Math.max(r.left, 0)),
    });

    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || (r.bottom <= vh + 2 && r.top >= -2)) continue;
    // Does the panel, or anything inside it, scroll? If so the rest of it
    // can be brought into view and nothing is lost.
    const scrolls = (node: Element) => {
      const s = getComputedStyle(node);
      return /(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 2;
    };
    if (scrolls(el) || Array.from(el.querySelectorAll("*")).some(scrolls)) continue;
    const unreachable: string[] = [];
    for (const c of Array.from(
      el.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]')
    )) {
      const ccs = getComputedStyle(c);
      if (ccs.display === "none" || ccs.visibility === "hidden") continue;
      const cr = c.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) continue;
      if (cr.top >= vh - 2 || cr.bottom <= 2) unreachable.push(nameOf(c));
      if (unreachable.length >= 6) break;
    }
    stuckPanels.push({ selector: cssPath(el), snippet: snippetOf(el), heightPx: Math.round(r.height), unreachable });
  }

  window.scrollTo(0, startY);
  return { viewportWidth: vw, viewportHeight: vh, pinned, stuckPanels };
}

const HELP = "https://www.w3.org/WAI/WCAG22/Understanding/reflow.html";

/** The height of the window the bars cover between them, overlaps counted once. */
export function coveredHeight(bars: Array<{ topPx: number; heightPx: number }>, viewportHeight: number): number {
  const spans = bars
    .map((b) => [Math.max(0, b.topPx), Math.min(viewportHeight, b.topPx + b.heightPx)] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let end = -1;
  for (const [a, b] of spans) {
    if (a > end) {
      total += b - a;
      end = b;
    } else if (b > end) {
      total += b - end;
      end = b;
    }
  }
  return total;
}

/** Pure and deterministic. */
export function evaluateReflowHeight(s: ReflowHeightSignals | undefined): AccessibilityFinding[] {
  if (!s || s.viewportHeight <= 0) return [];
  const findings: AccessibilityFinding[] = [];

  for (const panel of s.stuckPanels) {
    if (panel.unreachable.length === 0) continue;
    const names = panel.unreachable.map((n) => `“${n}”`).join(", ");
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "1.4.10",
      wcagLevel: "AA",
      selector: panel.selector,
      elementSnippet: panel.snippet,
      description: `Zoomed to 400% (a window ${s.viewportHeight}px tall), this panel is pinned to the screen and ${panel.heightPx}px tall, and it does not scroll. ${panel.unreachable.length === 1 ? "One control in it sits" : `${panel.unreachable.length} controls in it sit`} below the bottom edge, where nobody zoomed in can reach ${panel.unreachable.length === 1 ? "it" : "them"}: ${names}. Scrolling the page does not help, because a pinned panel does not move.`,
      suggestedFix:
        "Let the panel scroll inside itself (max-height: 100vh with overflow-y: auto), or stop pinning it when the window is short (a max-height media query). Put its buttons first, above the long text, so they are the part that shows.",
      ruleId: "reflow-height-unreachable",
      helpUrl: HELP,
    });
  }

  // Bars only: a pinned box across at least half the width. A narrow side
  // panel leaves the text beside it readable and is not counted, and a panel
  // already reported above is the cause of its own finding.
  const reported = new Set(findings.map((f) => f.selector));
  const bars = s.pinned.filter((p) => !reported.has(p.selector) && p.widthPx >= s.viewportWidth / 2);
  const pinnedPx = coveredHeight(bars, s.viewportHeight);
  const left = s.viewportHeight - pinnedPx;
  if (bars.length > 0 && pinnedPx > s.viewportHeight / 2) {
    const lost = left < MIN_READABLE_PX;
    const pct = Math.round((pinnedPx / s.viewportHeight) * 100);
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: lost ? "serious" : "moderate",
      category: lost ? "accessibility" : "design-clarity",
      ...(lost ? { wcagCriterion: "1.4.10", wcagLevel: "AA" as const } : {}),
      selector: bars[0].selector,
      elementSnippet: bars[0].snippet,
      description: lost
        ? `Zoomed to 400% (a window ${s.viewportHeight}px tall), bars pinned to the screen take ${pinnedPx}px of it, ${pct}%, across ${bars.length} element${bars.length === 1 ? "" : "s"}. That leaves ${Math.max(0, left)}px to read the page through: not one line of text. Someone who zooms in to read cannot read the page at all.`
        : `Zoomed to 400% (a window ${s.viewportHeight}px tall), bars pinned to the screen take ${pinnedPx}px of it, ${pct}%, across ${bars.length} element${bars.length === 1 ? "" : "s"}. The page still reads, through a slot of ${left}px. Someone who zooms in to read sees a few lines at a time and loses their place between them.`,
      suggestedFix:
        "Stop pinning the bars when the window is short: a media query on height (for example max-height: 500px) that sets position: static, or a header that scrolls away and returns on scroll up.",
      ruleId: lost ? "reflow-height-pinned" : "reflow-height-pinned-advisory",
      helpUrl: HELP,
    });
  }
  return findings;
}
