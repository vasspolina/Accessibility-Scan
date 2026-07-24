import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Text-resizing checks: WCAG 1.4.4 Resize Text (AA) and 1.4.12 Text Spacing
// (AA). Neither can be judged from static markup — both are defined by what
// happens when the *user* changes something, so the only honest test is to
// change it and look. The renderer applies each override in turn and measures
// the page again; this compares the measurements.
//
// Everything is judged against a baseline taken before any override, so an
// element that was already clipping its own content isn't blamed on the
// resize. Only newly-broken elements are reported.

export interface ClipMeasurement {
  // Selectors of elements whose text is cut off and unreachable — the content
  // overflows the box and the overflow is hidden rather than scrollable.
  clipped: string[];
  snippets: Record<string, string>;
  documentScrollWidth: number;
  viewportWidth: number;
  // Base64 JPEG evidence captured WHILE the override was applied, keyed by
  // selector. It has to be taken then: once the override is removed the page
  // reverts and the breakage is no longer visible anywhere.
  shots?: Record<string, string>;
  // The viewport in its overridden state — the only way to show sideways
  // scrolling, which is a property of the page rather than any one element.
  viewportShot?: string;
}

export interface TextResizeSignals {
  baseline: ClipMeasurement;
  // After applying the WCAG 1.4.12 text-spacing overrides.
  spacing: ClipMeasurement;
  // After setting the root font size to 200% (WCAG 1.4.4).
  zoom: ClipMeasurement;
}

// The exact overrides WCAG 1.4.12 requires a page to survive. Quoted from the
// success criterion rather than approximated, because "no loss of content or
// functionality" is only meaningful against these precise values.
export const TEXT_SPACING_CSS = `* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p, li, dd, blockquote, figcaption {
  margin-bottom: 2em !important;
}`;

// Text-only enlargement, which is what 1.4.4 is about — a reader who has
// raised their browser's default font size, not one using full-page zoom
// (that scales the layout with the text and rarely breaks anything).
export const TEXT_ZOOM_CSS = `html { font-size: 200% !important; }`;

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables, all helpers inline).
export function measureTextClippingInPage(): ClipMeasurement {
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

  const clipped: string[] = [];
  const snippets: Record<string, string> = {};

  for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    if (clipped.length >= 25) break;
    try {
      const text = (el.textContent ?? "").trim();
      if (text.length < 8) continue;
      // Only leaf-ish text holders — a wrapper reports its children's overflow
      // too, which would blame the whole page for one broken caption.
      if (el.querySelector("p, li, h1, h2, h3, h4, h5, h6, td, dd, figcaption")) continue;

      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;

      // Content taller/wider than the box is only a *loss* when the overflow
      // can't be reached. "auto"/"scroll" means the user can still get to it;
      // "hidden"/"clip" means it's gone.
      const hiddenY = cs.overflowY === "hidden" || cs.overflowY === "clip";
      const hiddenX = cs.overflowX === "hidden" || cs.overflowX === "clip";
      const overflowsY = el.scrollHeight > el.clientHeight + 2;
      const overflowsX = el.scrollWidth > el.clientWidth + 2;
      if (!((hiddenY && overflowsY) || (hiddenX && overflowsX))) continue;

      const selector = cssPath(el);
      clipped.push(selector);
      snippets[selector] = (el.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    } catch {
      // skip a bad element
    }
  }

  return {
    clipped,
    snippets,
    documentScrollWidth: Math.round(
      Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0)
    ),
    viewportWidth: window.innerWidth,
  };
}

const HELP_RESIZE = "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html";
const HELP_SPACING = "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html";

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  wcagCriterion: string,
  selector: string,
  snippet: string | undefined,
  shot: string | undefined,
  title: string,
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
    wcagLevel: "AA",
    selector,
    elementSnippet: snippet,
    // Evidence of the page in its broken state, not its healthy one.
    elementScreenshot: shot,
    title,
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

const FIX_CLIPPING =
  "Let the box grow with its text: use min-height instead of a fixed height, and avoid overflow:hidden on anything containing copy. Sizing text areas in rem rather than px lets them scale with the reader's settings.";

/**
 * Pure and deterministic. Reports only elements that break *because of* the
 * override — anything already clipped at baseline is excluded, since that's a
 * pre-existing layout bug rather than a resize failure.
 */
export function evaluateTextResize(signals: TextResizeSignals): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  const baseline = new Set(signals.baseline.clipped);

  const newlyClipped = (m: ClipMeasurement) => m.clipped.filter((s) => !baseline.has(s));

  // WCAG 1.4.12 Text Spacing — the page must survive a reader's own spacing
  // overrides, which is how many dyslexic readers make text legible at all.
  const spacingBroken = newlyClipped(signals.spacing);
  if (spacingBroken.length > 0) {
    const worst = spacingBroken[0];
    findings.push(
      makeFinding(
        "text-spacing-clipped",
        "serious",
        "1.4.12",
        worst,
        signals.spacing.snippets[worst],
        signals.spacing.shots?.[worst],
        "Text gets cut off when a reader increases spacing",
        `${spacingBroken.length} element${spacingBroken.length === 1 ? "" : "s"} on this page cut text off when a visitor applies the line and letter spacing WCAG requires pages to tolerate. Many people with dyslexia rely on exactly these settings to read at all — and instead of reflowing, the words disappear behind a fixed-height box.`,
        FIX_CLIPPING,
        HELP_SPACING
      )
    );
  }

  // WCAG 1.4.4 Resize Text — raising the browser's default font size is the
  // most common adjustment low-vision readers make, and far more common than
  // any assistive technology.
  const zoomBroken = newlyClipped(signals.zoom);
  if (zoomBroken.length > 0) {
    const worst = zoomBroken[0];
    findings.push(
      makeFinding(
        "text-zoom-clipped",
        "serious",
        "1.4.4",
        worst,
        signals.zoom.snippets[worst],
        signals.zoom.shots?.[worst],
        "Text gets cut off at larger font sizes",
        `${zoomBroken.length} element${zoomBroken.length === 1 ? "" : "s"} cut text off when the reader's font size is doubled — the container keeps its size while the words grow, so the overflow is simply hidden. Raising the default font size is the most common adjustment people with low vision make, well ahead of any assistive software.`,
        FIX_CLIPPING,
        HELP_RESIZE
      )
    );
  }

  // Sideways scrolling introduced purely by enlarging text.
  const zoomOverflow = signals.zoom.documentScrollWidth - signals.zoom.viewportWidth;
  const baseOverflow = signals.baseline.documentScrollWidth - signals.baseline.viewportWidth;
  if (zoomOverflow > 5 && zoomOverflow > baseOverflow + 5) {
    findings.push(
      makeFinding(
        "text-zoom-horizontal-scroll",
        "moderate",
        "1.4.4",
        "body",
        undefined,
        signals.zoom.viewportShot,
        "Enlarging text makes the page scroll sideways",
        `At double the font size the page becomes about ${zoomOverflow}px wider than the window, so reading means scrolling left and right on every line. The layout is holding a fixed width instead of reflowing around the larger text.`,
        "Let the layout reflow: use max-width with percentage or rem-based widths rather than fixed pixel widths, and allow long words to wrap.",
        HELP_RESIZE
      )
    );
  }

  return findings;
}
