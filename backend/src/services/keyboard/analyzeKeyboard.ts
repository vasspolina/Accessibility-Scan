import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

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
  boxShadow: string;
  backgroundColor: string;
  borderColor: string;
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
  const hasOutline = focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0;
  return (
    hasOutline ||
    focused.boxShadow !== unfocused.boxShadow ||
    focused.backgroundColor !== unfocused.backgroundColor ||
    focused.borderColor !== unfocused.borderColor
  );
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

  return findings;
}
