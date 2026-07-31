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
  // Adequately-sized targets packed with less than 8px between their boxes.
  // Proximity misses hit the neighbour; size checks alone never see it.
  crowdedPairs: Array<{ selector: string; snippet: string; neighbourSnippet: string; gapPx: number }>;
  // Fixed and sticky chrome visible at phone width, and how much of the
  // screen it holds between it.
  stickyCoverage: { totalPx: number; viewportHeight: number; elements: Array<{ selector: string; snippet: string; heightPx: number }> };
  // The WCAG 1.4.10 measurement, taken at 320 CSS px by the renderer — the
  // width the criterion is actually defined at. Optional because the phase
  // can fail independently of the 390 pass.
  reflow320?: { viewportWidth: number; documentScrollWidth: number; overflowingElements: Array<{ selector: string; snippet: string; overflowPx: number }> };
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
  // Every visible target's centre, measured once, so the spacing exception
  // below can be evaluated without re-reading layout per comparison.
  const centres: Array<{ x: number; y: number }> = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) centres.push({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }

  for (const el of interactive) {
    if (smallTapTargets.length >= 15) break;
    try {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // not visible
      // Inline links inside running text are exempt from the target-size rule.
      const inText = el.closest("p, li, span, td, dd, dt, h1, h2, h3, h4, h5, h6");
      if (el.tagName.toLowerCase() === "a" && inText) continue;
      if (r.width < 24 || r.height < 24) {
        // The spacing exception, which the criterion states outright: an
        // undersized target passes if a 24px-diameter circle centred on it
        // does not intersect the circle of any other target. Two such circles
        // intersect only when their centres are closer than 24px apart.
        //
        // Without this the check flagged correct pages. A default-styled
        // button is about 21px tall, so an isolated, properly labelled button
        // with nothing near it was reported as too small to tap — which the
        // standard explicitly says it is not. Measured on a fixture whose
        // control section is deliberately correct: three findings, all of them
        // wrong, on a button, a link and a labelled input.
        //
        // What remains flagged is the case that actually hurts: small targets
        // packed tightly together, where a near miss hits the neighbour.
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        let crowded = false;
        for (const c of centres) {
          const dx = c.x - cx;
          const dy = c.y - cy;
          if (dx === 0 && dy === 0) continue; // itself
          if (Math.sqrt(dx * dx + dy * dy) < 24) {
            crowded = true;
            break;
          }
        }
        if (!crowded) continue;
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

  // Adequately-sized targets with almost no gap between them. The tap-target
  // check above owns undersized controls; this owns the case where every
  // control passes on size and a thumb still cannot land cleanly, because the
  // next target starts less than 8px away. Inline text links keep their
  // WCAG exception here too.
  const crowdedPairs: MobileSignals["crowdedPairs"] = [];
  const sized: Array<{ el: Element; r: DOMRect }> = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    // At 44px — the comfortable size — a centred tap has enough slack that
    // even a flush neighbour is out of reach; gov.uk's large segmented
    // header buttons sit at 0px gap and are fine. The band where proximity
    // genuinely hurts is adequate-but-not-generous: 24 to 43px.
    if (Math.min(r.width, r.height) >= 44) continue;
    // A text field flush against its submit button is one composite control
    // (every search box ever built), not two targets competing for a thumb.
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const t = ((el as HTMLInputElement).type || "text").toLowerCase();
      if (t !== "button" && t !== "submit" && t !== "checkbox" && t !== "radio") continue;
    }
    const inText = el.closest("p, li, span, td, dd, dt, h1, h2, h3, h4, h5, h6");
    if (tag === "a" && inText) continue;
    sized.push({ el, r });
    if (sized.length >= 120) break;
  }
  const seenPair = new Set<Element>();
  outer: for (let i = 0; i < sized.length; i++) {
    for (let j = i + 1; j < sized.length; j++) {
      if (crowdedPairs.length >= 8) break outer;
      const a = sized[i];
      const b = sized[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const gapX = Math.max(b.r.left - a.r.right, a.r.left - b.r.right, 0);
      const gapY = Math.max(b.r.top - a.r.bottom, a.r.top - b.r.bottom, 0);
      const overlapX = a.r.left < b.r.right && b.r.left < a.r.right;
      const overlapY = a.r.top < b.r.bottom && b.r.top < a.r.bottom;
      // Neighbours share an axis and sit under 8px apart on the other.
      const gap = overlapY ? gapX : overlapX ? gapY : Math.max(gapX, gapY);
      if (!(overlapX || overlapY) || gap >= 8) continue;
      if (seenPair.has(a.el) || seenPair.has(b.el)) continue;
      seenPair.add(a.el);
      seenPair.add(b.el);
      crowdedPairs.push({
        selector: cssPath(a.el),
        snippet: snippetOf(a.el),
        neighbourSnippet: snippetOf(b.el),
        gapPx: Math.round(gap),
      });
    }
  }

  // Fixed and sticky chrome currently on screen, summed. Height is what it
  // costs the reader: every pixel of it is a pixel of page they cannot use.
  const stickyEls: MobileSignals["stickyCoverage"]["elements"] = [];
  let stickyTotal = 0;
  for (const el of Array.from(document.querySelectorAll("*"))) {
    if (stickyEls.length >= 6) break;
    try {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.5 || r.height < 24) continue; // chrome, not a widget
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      // Nested bars double-count; keep outermost only.
      let p: Element | null = el.parentElement;
      let nested = false;
      while (p) {
        const pcs = getComputedStyle(p);
        if (pcs.position === "fixed" || pcs.position === "sticky") { nested = true; break; }
        p = p.parentElement;
      }
      if (nested) continue;
      stickyTotal += Math.round(r.height);
      stickyEls.push({ selector: cssPath(el), snippet: snippetOf(el), heightPx: Math.round(r.height) });
    } catch {
      // skip
    }
  }

  return {
    viewportWidth: vw,
    documentScrollWidth: Math.round(scrollWidth),
    overflowingElements,
    smallTapTargets,
    crowdedPairs,
    stickyCoverage: { totalPx: stickyTotal, viewportHeight: window.innerHeight, elements: stickyEls },
  };
}

/**
 * The 1.4.10 measurement, run by the renderer after it resizes to 320 CSS px
 * — the width the criterion is defined at. Content inside a horizontally
 * scrollable container is the SC's own exception for two-dimensional content
 * (tables, maps, code): the container scrolls, the page does not, and whether
 * that container is keyboard-reachable is axe's scrollable-region-focusable
 * rule's job, not this one's.
 */
export function collectReflow320InPage(): NonNullable<MobileSignals["reflow320"]> {
  const vw = window.innerWidth;
  const scrollWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0
  );
  const overflowingElements: NonNullable<MobileSignals["reflow320"]>["overflowingElements"] = [];
  if (scrollWidth > vw + 3) {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (overflowingElements.length >= 6) break;
      if (el === document.documentElement || el === document.body) continue;
      try {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const overflowPx = Math.round(r.right - vw);
        if (overflowPx <= 5 || r.left >= vw) continue;
        const parent = el.parentElement;
        const parentFits = !parent || parent.getBoundingClientRect().right <= vw + 5;
        if (!parentFits) continue;
        // The 2D-content exception: inside a container that scrolls
        // horizontally on purpose.
        let scrollAncestor = false;
        let p: Element | null = el.parentElement;
        while (p && p !== document.body) {
          const pcs = getComputedStyle(p);
          if (/(auto|scroll)/.test(pcs.overflowX)) { scrollAncestor = true; break; }
          p = p.parentElement;
        }
        if (scrollAncestor) continue;
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node.nodeType === 1 && parts.length < 6) {
          let selector = node.tagName.toLowerCase();
          const par: Element | null = node.parentElement;
          if (par) {
            const tag = node.tagName;
            const siblings = Array.from(par.children).filter((c) => c.tagName === tag);
            if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
          }
          parts.unshift(selector);
          node = par;
        }
        overflowingElements.push({
          selector: parts.join(" > "),
          snippet: (el.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
          overflowPx,
        });
      } catch {
        // skip
      }
    }
  }
  return { viewportWidth: vw, documentScrollWidth: Math.round(scrollWidth), overflowingElements };
}

const FIX_HSCROLL =
  "Make the layout fit the screen: put max-width:100% on images, videos, and tables, avoid fixed pixel widths wider than the screen, and let content wrap. Test the page at 320px wide.";
const FIX_TAP =
  "Make tap targets at least 24×24px (44×44px is more comfortable), with a little space between them — add padding to the element rather than shrinking it.";

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  wcagCriterion: string,
  wcagLevel: "A" | "AA" | "AAA",
  selector: string,
  snippet: string,
  description: string,
  suggestedFix: string,
  helpUrl: string,
  // The 390-only reflow case says in its own copy that it is not a
  // conformance failure, and a scored accessibility finding would contradict
  // that sentence. Advisories go to the design notes with the others.
  category: AccessibilityFinding["category"] = "accessibility"
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category,
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

  // Reflow. The conformance claim is made at 320 CSS px — the width 1.4.10
  // is defined at — with the 390 measurement as supporting evidence. Before
  // this, the claim was measured at 390 only: the right idea at the wrong
  // width, which is a conformance statement nobody asked the criterion about.
  const failed320 = !!m.reflow320 && m.reflow320.documentScrollWidth > m.reflow320.viewportWidth + 5;
  const failed390 = m.documentScrollWidth > m.viewportWidth + 5;
  if (failed320 || failed390) {
    const at320 = failed320 ? m.reflow320! : undefined;
    const culprits =
      (at320?.overflowingElements.length ? at320.overflowingElements : m.overflowingElements).length > 0
        ? (at320?.overflowingElements.length ? at320.overflowingElements : m.overflowingElements)
        : [
            {
              selector: "body",
              snippet: "",
              overflowPx:
                (at320?.documentScrollWidth ?? m.documentScrollWidth) -
                (at320?.viewportWidth ?? m.viewportWidth),
            },
          ];
    const width = at320 ? 320 : m.viewportWidth;
    const both = failed320 && failed390;
    for (const c of culprits) {
      findings.push(
        makeFinding(
          "mobile-horizontal-scroll",
          failed320 ? "serious" : "moderate",
          // Only the 320 measurement is the criterion's own test. A page
          // that fits at 320 but scrolls at 390 has a real problem and not
          // a 1.4.10 failure, and the two must not be conflated.
          failed320 ? "1.4.10" : "N/A",
          "AA",
          c.selector,
          c.snippet,
          failed320
            ? `At the 320px width WCAG defines for reflow, this element extends about ${c.overflowPx}px past the edge, so the whole page scrolls sideways${both ? ` — and it still scrolls at a typical ${m.viewportWidth}px phone width (${m.documentScrollWidth}px wide)` : ""}.`
            : `On a ${width}px-wide phone screen this element extends about ${c.overflowPx}px past the edge, so the whole page scrolls sideways (it renders ${m.documentScrollWidth}px wide). It does fit at the 320px width WCAG measures reflow at, so this is a real-phone problem rather than a conformance failure.`,
          FIX_HSCROLL,
          "https://www.w3.org/WAI/WCAG21/Understanding/reflow.html",
          failed320 ? "accessibility" : "design-clarity"
        )
      );
    }
  }

  for (const t of m.smallTapTargets) {
    findings.push(
      makeFinding(
        "mobile-tap-target",
        "moderate",
        // 2.5.5 Target Size, and Level AAA, because this report measures
        // WCAG 2.1 and that is where 2.1 puts target size. It was tagged
        // 2.5.8 at AA, which is a WCAG 2.2 criterion that does not exist in
        // 2.1 at all — so the badge read "Required by law in most places",
        // for something 2.1 explicitly does not require. Overclaiming a legal
        // obligation is the same fault as overclaiming conformance, pointed
        // the other way, and this tool refuses the one so it must refuse the
        // other.
        //
        // The finding stays. Small targets genuinely hurt people with tremors,
        // large fingers, or a phone on a bumpy train, and 2.2 agrees — it adds
        // exactly this as an AA requirement. The conformance checklist covers
        // A and AA only, so it correctly leaves this out, and the level badge
        // now says "Advanced (Level AAA)" rather than implying a duty.
        "2.5.5",
        "AAA",
        t.selector,
        t.snippet,
        `On a phone this tap target is only ${t.width}×${t.height}px, so it's easy to miss or to tap the wrong thing. That is below the 24×24px floor WCAG 2.2 sets as a requirement. WCAG 2.1, which this report measures against, only covers target size at Level AAA, where the bar is higher still at 44×44px.`,
        FIX_TAP,
        "https://www.w3.org/WAI/WCAG21/Understanding/target-size.html"
      )
    );
  }

  // Targets that pass every size check and still sit less than 8px apart.
  // A thumb is not a cursor: proximity misses land on the neighbour.
  for (const pair of m.crowdedPairs.slice(0, 4)) {
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "minor",
      // A design decision with no criterion behind it in 2.1 or 2.2 — the
      // spacing exception in 2.5.8 exempts, it does not require. Advisory,
      // outside the score, routed to whoever owns how the page looks.
      category: "design-clarity",
      selector: pair.selector,
      elementSnippet: pair.snippet,
      description: `Two tap targets sit only ${pair.gapPx}px apart on a phone. Each is big enough on its own; together they leave no room to miss — a thumb aiming for one lands on the other.`,
      suggestedFix:
        "Put at least 8px between neighbouring tap targets — margin between them, or padding inside each. The controls can stay the same visual size.",
      ruleId: "mobile-target-spacing",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
    });
  }

  // Fixed and sticky chrome holding more than 30% of a phone screen.
  const sc = m.stickyCoverage;
  if (sc.viewportHeight > 0 && sc.totalPx > sc.viewportHeight * 0.3 && sc.elements.length > 0) {
    const pct = Math.round((sc.totalPx / sc.viewportHeight) * 100);
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "moderate",
      // 2.4.11 Focus Not Obscured is WCAG 2.2; this report measures 2.1.
      // Framed as readiness, not failure, same as the tap-target rule.
      category: "design-clarity",
      selector: sc.elements[0].selector,
      elementSnippet: sc.elements[0].snippet,
      description: `Bars pinned to the screen take up about ${pct}% of a phone display (${sc.totalPx}px of ${sc.viewportHeight}px, across ${sc.elements.length} element${sc.elements.length === 1 ? "" : "s"}). Every pinned pixel is one the visitor cannot read the page through, and anything the keyboard focuses can end up hidden behind it — which WCAG 2.2 makes a requirement (2.4.11 Focus Not Obscured).`,
      suggestedFix:
        "Slim the pinned bars on phone widths, or let them scroll away and return. Keep their combined height well under a third of the screen, and set scroll-margin-top on content so focused elements land clear of them.",
      ruleId: "mobile-sticky-coverage",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html",
    });
  }

  return findings;
}
