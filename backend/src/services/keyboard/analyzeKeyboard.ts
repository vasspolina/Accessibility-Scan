import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";
import { contrastRatio, parseColour, type Rgb } from "../contrast/suggestAccessibleColour.js";

/** 1.4.11 Non-text Contrast: 3:1 for anything identifying a component state. */
const FOCUS_CONTRAST_MIN = 3;

// Evaluates the results of a real keyboard walk-through: renderPage.ts
// presses Tab through the page (see captureKeyboardNavigation) and records,
// for every stop, the focused element's indicator styles plus the same
// styles once focus has moved on. Comparing the two tells us whether a
// sighted keyboard user can actually SEE where they are — WCAG 2.4.7 Focus
// Visible (AA) — and whether focus ever gets stuck — WCAG 2.1.2 No Keyboard
// Trap (A). This is interaction-level checking that static analysis (axe)
// deliberately doesn't attempt.

export interface TabStop {
  selector: string;
  tag: string;
  // Indicator-relevant computed styles while the element was focused.
  focused: FocusStyles;
  // Same styles re-read after focus moved on; null when the element could
  // not be re-resolved (detached, re-rendered) — those stops are skipped.
  unfocused: FocusStyles | null;
}

export interface FocusStyles {
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  backgroundColor: string;
  borderColor: string;
  /** Nearest opaque ancestor background — what the ring is seen against. */
  backdropColor: string;
}

/** A control a mouse can operate that the keyboard cannot reach at all. */
export interface MouseOnlyControl {
  selector: string;
  snippet: string;
  tag: string;
  /** Visible text, used to name the control in the finding. */
  label: string;
}

export interface KeyboardNavResult {
  stops: TabStop[];
  /**
   * Elements carrying a click handler that no amount of tabbing will reach.
   * Empty when the probe could not run, which is indistinguishable here from
   * a clean page — the same known limitation as `failed` below.
   */
  mouseOnly: MouseOnlyControl[];
  // True when tabbing wrapped back to <body> before the cap — we saw the
  // whole tab cycle, not just a prefix of it.
  reachedEnd: boolean;
  // Set when the walk threw partway through. Without it an aborted walk is
  // indistinguishable from a page with no keyboard problems, and the report
  // quietly scores the site as if we had checked.
  failed?: boolean;
}

function hasVisibleIndicator(stop: TabStop): boolean {
  const { focused, unfocused } = stop;
  if (!unfocused) return true; // can't compare — assume the best
  // A transparent outline is not an indicator. `outline: 3px solid
  // transparent` is a real and deliberate pattern — it gives Windows High
  // Contrast Mode something to recolour while a box-shadow does the visible
  // work — so the shadow check below is what rightly clears gov.uk and
  // wikipedia.org. But a page carrying only the transparent outline shows the
  // user nothing, and counting it as an indicator hid exactly that case.
  const hasOutline =
    focused.outlineStyle !== "none" &&
    parseFloat(focused.outlineWidth) > 0 &&
    alphaOf(focused.outlineColor) > 0;
  return (
    hasOutline ||
    focused.boxShadow !== unfocused.boxShadow ||
    focused.backgroundColor !== unfocused.backgroundColor ||
    focused.borderColor !== unfocused.borderColor
  );
}

/**
 * How well a focus ring stands out, judged against both surfaces it touches.
 *
 * An outline is drawn just outside the element's border box, so it runs
 * between two colours: the element's own background on the inside and
 * whatever the element sits on outside. A ring that contrasts with either one
 * is a ring you can see, so the better of the two is what counts. Taking only
 * the outer surface would report a dark button's dark focus ring as invisible
 * when it is plainly legible against the pale page behind it.
 *
 * Translucency has to be flattened first, or the maths runs against colours
 * nobody can see. `rgba(0, 0, 0, 0)` is how a computed style reports "no
 * background", and read as plain channels it is pure black — so a pale ring
 * on a transparent element scored about 15:1 against a surface that is not
 * there, and the check went quiet on exactly the elements most likely to be
 * at fault. Everything is composited onto the opaque backdrop before being
 * compared, which is what the screen does.
 */
function ringContrast(focused: FocusStyles): number {
  const ring = parseColour(focused.outlineColor);
  const backdrop = parseColour(focused.backdropColor);
  if (!ring || !backdrop) return Infinity; // unreadable — do not judge
  const ringAlpha = alphaOf(focused.outlineColor);
  // A fully transparent ring is not a faint ring, it is no ring. Saying it
  // fails on contrast would name the wrong fault; hasVisibleIndicator treats
  // it as absent, so keyboard-no-visible-focus is the rule that speaks.
  if (ringAlpha === 0) return Infinity;

  const surfaces: Rgb[] = [backdrop];
  const own = parseColour(focused.backgroundColor);
  const ownAlpha = alphaOf(focused.backgroundColor);
  if (own && ownAlpha > 0) surfaces.push(composite(own, ownAlpha, backdrop));

  return Math.max(...surfaces.map((s) => contrastRatio(composite(ring, ringAlpha, s), s)));
}

/**
 * Alpha from a computed colour, 1 when it carries none.
 *
 * Necessary because getComputedStyle reports translucency the contrast maths
 * cannot see: parseColour reads only the three channels, so `rgba(0,0,0,0)`
 * arrives as pure black and `rgba(0,0,0,0.15)` over red arrives as black too.
 * Measured on real pages — gov.uk and wikipedia.org both draw
 * `outline: solid transparent` and let a box-shadow do the visible work, and
 * smashingmagazine.com layers `rgba(0, 0, 0, 0.15)` over its red banner.
 */
function alphaOf(colour: string): number {
  const s = colour.trim().toLowerCase();
  if (s === "transparent") return 0;
  const m = /^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+([\d.]+)\s*\)$/.exec(s);
  if (!m) return 1;
  const a = Number(m[1]);
  return Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1;
}

/** Flattens a translucent colour onto an opaque one, as the screen does. */
function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  if (alpha >= 1) return fg;
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  wcagCriterion: string,
  wcagLevel: "A" | "AA",
  helpUrl: string,
  selector: string,
  description: string,
  suggestedFix: string,
  elementSnippet?: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "accessibility",
    wcagCriterion,
    wcagLevel,
    selector,
    elementSnippet: elementSnippet || undefined,
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

/**
 * Pure and deterministic — one grouped finding per rule, consistent with the
 * typography and motion checks.
 */
export function evaluateKeyboardNav(nav: KeyboardNavResult): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  // Controls only a mouse can use. Checked before the tab-stop rules and
  // independently of them: the fault is that these elements never appear as a
  // tab stop at all, so an empty or failed walk says nothing about them.
  for (const c of nav.mouseOnly ?? []) {
    findings.push(
      makeFinding(
        "keyboard-mouse-only",
        // The highest severity this layer reports, and it is the right one.
        // A missing focus outline makes a task hard; this makes it
        // impossible. Anyone who cannot use a mouse — a motor disability, a
        // screen reader user, someone whose trackpad has died — cannot reach
        // this control by any means.
        "critical",
        "2.1.1",
        "A",
        "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
        c.selector,
        `${c.label ? `"${c.label}" is a <${c.tag}>` : `A <${c.tag}> on this page`} that responds to being clicked, but the Tab key never lands on it. A <${c.tag}> is not focusable on its own, and nothing has been added to make it one, so someone working through the page by keyboard cannot reach this at all — it is not merely awkward to get to, it is not there.`,
        "Use a real `<button>` (or `<a href>` if it navigates). If the element has to stay as it is, it needs all three of: `tabindex=\"0\"` so it can be focused, `role=\"button\"` so it is announced as one, and a keydown handler firing on Enter and Space — a click handler alone does not run for keyboard users.",
        c.snippet
      )
    );
  }

  if (nav.stops.length === 0) return findings;

  // Focus trap / stuck focus: the same element stays focused across three
  // or more consecutive Tab presses.
  let runLength = 1;
  let trappedSelector: string | null = null;
  for (let i = 1; i < nav.stops.length; i++) {
    if (nav.stops[i].selector === nav.stops[i - 1].selector) {
      runLength += 1;
      if (runLength >= 3) {
        trappedSelector = nav.stops[i].selector;
        break;
      }
    } else {
      runLength = 1;
    }
  }
  if (trappedSelector) {
    findings.push(
      makeFinding(
        "keyboard-focus-trap",
        "critical",
        "2.1.2",
        "A",
        "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html",
        trappedSelector,
        "Keyboard focus gets stuck: pressing Tab repeatedly leaves focus on the same element, so keyboard users cannot move past it to reach the rest of the page.",
        "Ensure every focusable element passes focus on when Tab is pressed — check for JavaScript that cancels keydown events or re-focuses the element."
      )
    );
  }

  // Invisible focus: element focused but visually indistinguishable from
  // its unfocused state (no outline, and no box-shadow/background/border
  // change).
  const comparable = nav.stops.filter((s) => s.unfocused !== null);
  const invisible = comparable.filter((s) => !hasVisibleIndicator(s));
  // Require at least two offenders (or every stop being invisible) before
  // reporting — a single odd element is more likely a measurement artifact
  // than a real site-wide pattern like `outline: none`.
  if (invisible.length >= 2 || (invisible.length === 1 && comparable.length === 1)) {
    findings.push(
      makeFinding(
        "keyboard-no-visible-focus",
        "serious",
        "2.4.7",
        "AA",
        "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html",
        invisible[0].selector,
        `Moving through the page with the Tab key gives no visible sign of where you are: ${invisible.length} of ${comparable.length} keyboard stops show no focus outline, highlight, or any other visual change. Sighted keyboard users are navigating blind.`,
        "Remove `outline: none` (or provide a replacement) so every interactive element shows a clear focus indicator — e.g. `:focus-visible { outline: 2px solid; outline-offset: 2px; }`."
      )
    );
  }

  // A focus ring too faint to notice. The checklist this came from calls the
  // focus indicator the single most common failure, and a 1px pale-grey
  // outline fails it just as surely as `outline: none` — it is technically
  // present and practically invisible.
  //
  // Two constraints keep this honest, both from the standard itself:
  //
  // 1. Browser default focus styles are exempt. 1.4.11's Understanding
  //    document says so outright: "Where the focus style of the user agent is
  //    not adjusted ... the default focus style is exempt from contrast
  //    requirements (but must still be visible)." Chrome's default ring
  //    computes as `outline-style: auto`, and authors essentially never write
  //    that themselves, so it is a reliable marker for "untouched". Reporting
  //    those would be inventing a fault the standard explicitly excuses —
  //    the same error as claiming a criterion the version under test does not
  //    contain.
  //
  // 2. An element with a box-shadow ring is skipped. `box-shadow: 0 0 0 3px`
  //    is a common way to draw a focus indicator, and the shadow can be doing
  //    the visible work while the outline is a faint leftover. Parsing shadow
  //    colours reliably is another problem; declining to judge that case is
  //    better than guessing at it.
  //
  // Note this is 1.4.11 Non-text Contrast, not 2.4.7. WCAG 2.2 does add a
  // criterion specifically about how a focus indicator looks — but that is
  // 2.4.13 Focus Appearance, and it is Level AAA, so it would carry no legal
  // weight. 1.4.11 is AA and in WCAG 2.1, and its Understanding document
  // states that with 2.4.7 "the visual focus indicator ... must have
  // sufficient contrast against the adjacent background".
  const faint = comparable.filter((s) => {
    const { focused } = s;
    if (focused.outlineStyle === "auto") return false; // UA default, exempt
    if (focused.outlineStyle === "none") return false; // handled above
    if (parseFloat(focused.outlineWidth) <= 0) return false;
    if (s.unfocused && focused.boxShadow !== s.unfocused.boxShadow) return false;
    return ringContrast(focused) < FOCUS_CONTRAST_MIN;
  });
  if (faint.length >= 2) {
    const worst = faint[0];
    const ratio = ringContrast(worst.focused);
    findings.push(
      makeFinding(
        "keyboard-faint-focus",
        "serious",
        "1.4.11",
        "AA",
        "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
        worst.selector,
        // Just the measurement. The widget shows this above "Why this
        // matters", which already covers why a faint ring survives testing,
        // and saying it twice in consecutive paragraphs was the exact fault
        // this report gets criticised for elsewhere.
        `${faint.length} of the ${comparable.length} places the Tab key stops draw a focus ring at roughly ${ratio.toFixed(1)}:1 against what sits behind it. Three to one is the minimum for an indicator to count as visible.`,
        "Two changes: a stronger colour and more weight. Pick a focus colour at least three times as light or dark as whatever sits behind it — in practice a firm dark tone or your brand colour, not a pale grey — and draw it at 2px or more. Add `outline-offset: 2px` so the ring sits just off the control instead of merging into its own border. A 1px line in a light grey reads as a rendering glitch rather than as “you are here”, which is why it survives testing and still fails in use."
      )
    );
  }

  return findings;
}
