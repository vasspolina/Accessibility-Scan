import { contrastRatio, parseColour } from "./suggestAccessibleColour.js";
import { alphaOf, composite } from "../keyboard/analyzeKeyboard.js";
import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// 1.4.11 Non-text Contrast, for the criterion's actual subject.
//
// This row was declared "automated" while the only measurement behind it was
// the focus ring: button and input borders, checkbox and toggle indicators —
// the things the criterion is about — were never read, and the report printed
// "Are buttons and icons dark enough to make out?" over a pass.
//
// Deliberately scoped to what a measurement can prove. A control whose border
// is PRESENT but too faint against the surface it sits on is a measured
// failure of the indicator the designer plainly intended. A control with no
// border at all is NOT judged: 1.4.11 only requires a visual boundary when
// one is needed to identify the control, and whether the label alone
// identifies it is a judgement this scan must not fake. Same standard the
// registry sets elsewhere — only claim what the firing proves.

export interface ControlBoundarySample {
  selector: string;
  snippet: string;
  tag: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  /** Nearest opaque ancestor background — the surface the border sits on. */
  surfaceColor: string;
  disabled: boolean;
}

/** Runs inside the browser page context via page.evaluate — must be fully
 *  self-contained (no closures over outer scope, no named inner functions:
 *  esbuild's keepNames rewrites those into __name calls that do not exist
 *  in the page). */
export function collectControlBoundariesInPage(): ControlBoundarySample[] {
  const SELECTOR =
    'button, input:not([type="hidden"]), select, textarea, [role="button"], [role="checkbox"], [role="switch"], [role="radio"]';
  const MAX = 40;
  const out: ControlBoundarySample[] = [];
  for (const el of Array.from(document.querySelectorAll(SELECTOR))) {
    if (out.length >= MAX) break;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw < 1 || cs.borderTopStyle === "none" || cs.borderTopStyle === "hidden") continue;
    // The surface the border is seen against: first opaque ancestor bg.
    let surface = "rgb(255, 255, 255)";
    let node: Element | null = el.parentElement;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
        surface = bg;
        break;
      }
      node = node.parentElement;
    }
    const parts: string[] = [];
    let pathNode: Element | null = el;
    while (pathNode && pathNode.nodeType === 1 && parts.length < 6) {
      if (pathNode.id) {
        parts.unshift(`#${CSS.escape(pathNode.id)}`);
        break;
      }
      let sel = pathNode.tagName.toLowerCase();
      const parent: Element | null = pathNode.parentElement;
      if (parent) {
        const tag = pathNode.tagName;
        const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === tag);
        if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(pathNode) + 1})`;
      }
      parts.unshift(sel);
      pathNode = parent;
    }
    out.push({
      selector: parts.join(" > "),
      snippet: (el.outerHTML || "").slice(0, 200),
      tag: el.tagName.toLowerCase(),
      borderColor: cs.borderTopColor,
      borderWidth: bw,
      backgroundColor: cs.backgroundColor,
      surfaceColor: surface,
      // Disabled controls are exempt from 1.4.11 by the criterion's own text.
      disabled:
        (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true",
    });
  }
  return out;
}

/**
 * Pure and deterministic. One card — a form whose every input has the same
 * faint border is one decision, made once, applied everywhere.
 */
export function evaluateControlContrast(
  samples: ControlBoundarySample[] | undefined
): AccessibilityFinding[] {
  if (!samples?.length) return [];
  const faint = samples.filter((s) => {
    if (s.disabled) return false;
    const border = parseColour(s.borderColor);
    const surface = parseColour(s.surfaceColor);
    if (!border || !surface) return false;
    const borderAlpha = alphaOf(s.borderColor);
    // A fully transparent border is no border; the no-boundary case is out
    // of scope on purpose — see the module note.
    if (borderAlpha === 0) return false;
    const drawn = composite(border, borderAlpha, surface);
    // Judged against the better of its two surfaces, like the focus ring: a
    // border legible against the control's own fill is a border you can see.
    const surfaces = [surface];
    const own = parseColour(s.backgroundColor);
    const ownAlpha = alphaOf(s.backgroundColor);
    if (own && ownAlpha > 0) surfaces.push(composite(own, ownAlpha, surface));
    const best = Math.max(...surfaces.map((sf) => contrastRatio(drawn, sf)));
    // 3:1 is the criterion's own number. 1.15 floors out borders that match
    // their surface on purpose (a flat design's same-colour border is the
    // no-boundary case wearing a border property).
    return best < 3 && best > 1.15;
  });
  if (faint.length === 0) return [];
  const worst = faint[0];
  return [
    {
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "1.4.11",
      wcagLevel: "AA",
      ruleId: "control-faint-boundary",
      selector: worst.selector,
      elementSnippet: worst.snippet,
      description: `${faint.length === 1 ? "A form control draws its border" : `${faint.length} form controls draw their borders`} too faintly to make out — measured below the 3:1 contrast WCAG requires for a control's visible parts. In bright light the box edges disappear, and with them the sense of where to click and type.`,
      suggestedFix:
        "Darken the borders until they reach 3:1 against the background they sit on. One shade change on the shared input style usually fixes every control at once.",
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
    },
  ];
}
