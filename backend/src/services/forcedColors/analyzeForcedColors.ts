import { randomUUID } from "node:crypto";
import type { TabStop } from "../keyboard/analyzeKeyboard.js";
import type { UserPreferenceSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Forced Colors Mode — what Windows High Contrast users actually get.
//
// The operating system throws away the page's palette and substitutes a small
// set of system colours the user has chosen, usually for very low vision or
// severe light sensitivity. It is not a niche: it is the built-in accessible
// display mode of the most-used desktop OS, and nothing else in this report
// says a word about it.
//
// What the mode does was measured against a fixture rather than taken from
// documentation, because the exact list is what the rules below depend on:
//
//   box-shadow       -> none          (removed outright)
//   background-image -> none          (removed outright)
//   background-color -> system Canvas (every author colour becomes one colour)
//   border-color     -> system text colour
//   outline          -> kept, recoloured
//
// Two consequences are worth reporting, and they are the two below. Both are
// invisible in every other kind of testing, because the page looks perfect
// until the moment the mode is switched on.

const FORCED_COLORS_URL =
  "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors";

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  selector: string,
  description: string,
  suggestedFix: string,
  elementSnippet?: string,
  wcag?: { criterion: string; level: "A" | "AA" }
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "accessibility",
    selector,
    elementSnippet: elementSnippet || undefined,
    description,
    suggestedFix,
    ruleId,
    helpUrl: FORCED_COLORS_URL,
    ...(wcag ? { wcagCriterion: wcag.criterion, wcagLevel: wcag.level } : {}),
  };
}

/**
 * True when the only thing marking this element as focused is something
 * forced colours deletes or flattens.
 *
 * An outline survives the mode, so an element that draws one is fine no
 * matter what else it does. Everything else people reach for does not: a
 * box-shadow ring is removed, and a focus style that swaps the background or
 * border colour stops distinguishing anything, because the focused and
 * unfocused colours both collapse to the same system colour.
 *
 * A transparent outline counts as no outline here, exactly as it does for the
 * visible-focus rules — except that this is the one place the deliberate
 * `outline: solid transparent` idiom pays off, since forced colours recolours
 * it into a real, visible ring. That is precisely why gov.uk and
 * wikipedia.org write it, and why neither is reported below.
 */
function indicatorSurvivesForcedColors(stop: TabStop): boolean {
  const { focused, unfocused } = stop;
  if (!unfocused) return true; // nothing to compare — do not judge
  const outlineWidth = parseFloat(focused.outlineWidth);
  const hasOutline =
    focused.outlineStyle !== "none" && !Number.isNaN(outlineWidth) && outlineWidth > 0;
  // Deliberately not checking the outline's colour. A transparent one is
  // useless in normal rendering — keyboard-faint-focus and
  // keyboard-no-visible-focus deal with that — but under forced colours the
  // system paints it, which is the entire point of the idiom.
  return hasOutline;
}

export function evaluateForcedColors(
  stops: TabStop[],
  signals: UserPreferenceSignals
): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  // 1. Focus indicators that exist only as a box-shadow, background swap or
  //    border swap. Comparable stops only: a stop whose unfocused state could
  //    not be re-read tells us nothing either way.
  const comparable = stops.filter((s) => s.unfocused !== null);
  // Must have an indicator to lose. A stop with nothing at all is already
  // reported by keyboard-no-visible-focus, and saying it a second time here
  // would be two complaints about one fault — this rule is specifically
  // about a page that looks correct until the mode is switched on.
  const lost = comparable.filter((s) => {
    const shows =
      s.focused.boxShadow !== s.unfocused!.boxShadow ||
      s.focused.backgroundColor !== s.unfocused!.backgroundColor ||
      s.focused.borderColor !== s.unfocused!.borderColor;
    return shows && !indicatorSurvivesForcedColors(s);
  });
  // Two before reporting, matching the other focus rules: one odd element is
  // more likely a measurement artifact than a pattern in the stylesheet.
  if (lost.length >= 2) {
    findings.push(
      makeFinding(
        "forced-colors-focus-lost",
        "serious",
        lost[0].selector,
        `In Windows High Contrast Mode this page shows no focus indicator on ${lost.length} of its ${comparable.length} keyboard stops. The highlight is drawn with a box-shadow or a colour swap, and that mode removes both.`,
        "Add a real `outline` to your focus styles and keep the box-shadow alongside it for everyone else — `:focus-visible { outline: 2px solid; outline-offset: 2px; }`. An outline is the one indicator the mode preserves, and it recolours it to the user's chosen highlight. If the outline would clash with your design, `outline: 3px solid transparent` is invisible normally and becomes a real ring in forced colours. That is the standard idiom, not a hack.",
        undefined,
        // 2.4.7 Focus Visible, and it genuinely is one: for this user there
        // is no visible focus indicator on any of these controls.
        { criterion: "2.4.7", level: "AA" }
      )
    );
  }

  // 2. Buttons and links whose only content is a CSS background image, which
  //    the mode deletes. The control stays clickable and becomes an empty box.
  for (const icon of signals.iconLostInForcedColors) {
    findings.push(
      makeFinding(
        "forced-colors-icon-lost",
        "serious",
        icon.selector,
        `This ${icon.tag} takes its whole appearance from a background image, and Windows High Contrast Mode removes background images. The control still works, but it renders as an empty box.`,
        "Use a real `<img>` or an inline `<svg>` instead of a CSS background image, so the icon survives. For SVG, set `fill=\"currentColor\"` so it takes the system colour. Adding visible text is better still. Whatever you choose, keep the label a screen reader reads out. A screen reader user needs it whether or not the picture appears.",
        icon.snippet
      )
    );
  }

  return findings;
}
