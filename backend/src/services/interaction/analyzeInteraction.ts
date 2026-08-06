import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityReport } from "../../types/report.js";

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];

const MOTION_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation.html";
const KEY_SHORTCUT_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html";
const ON_INPUT_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/on-input.html";
const POINTER_CANCEL_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html";

/**
 * Four criteria about how the page responds to being used.
 *
 * None of them leaves a trace in the markup, which is why all three sat at
 * "a person must check" with nothing said about them. The probe in
 * browserPool.ts patches addEventListener before any page script runs, so
 * the listeners are at least visible now.
 *
 * Visible, not judged. A page that listens for device motion may offer a
 * button beside it; a document-level keydown handler may only ever act on
 * Escape, which is not a character key; an element that acts on mousedown
 * may be doing something harmless to undo. Each row here says a listener is
 * there and names the question, which is as far as the evidence reaches.
 *
 * The fourth, 3.2.2 On Input, is limited for a different reason and a firmer
 * one. Testing it properly means changing a control's value and watching what
 * happens — on a stranger's live site that can submit a form, place an order
 * or fire an analytics event, and a scan has no business doing any of those
 * uninvited. So it reads the markup's shape instead and says so.
 */
export function evaluateInteraction(
  listeners: DomSignals["listeners"]
): UndecidedRow[] {
  const rows: UndecidedRow[] = [];

  if (listeners.motion) {
    rows.push({
      ruleId: "interaction-motion-actuation",
      count: 1,
      help: "The page reacts to the phone being moved",
      helpUrl: MOTION_URL,
    });
  }

  if (listeners.keyboardGlobal) {
    rows.push({
      ruleId: "interaction-key-shortcuts",
      count: 1,
      help: "The page listens for key presses everywhere",
      helpUrl: KEY_SHORTCUT_URL,
    });
  }

  // 3.2.2 On Input. Reported from the markup's shape alone — see the
  // renderPage comment for why the scan will not test this by changing
  // values on a live page.
  if (listeners.actsOnChange.length > 0) {
    rows.push({
      ruleId: "interaction-acts-on-change",
      count: listeners.actsOnChange.length,
      help: "Controls that may act as soon as you set them",
      helpUrl: ON_INPUT_URL,
    });
  }

  if (listeners.pressWithoutRelease.length > 0) {
    rows.push({
      ruleId: "interaction-pointer-cancellation",
      count: listeners.pressWithoutRelease.length,
      help: "Controls that act the moment they are pressed",
      helpUrl: POINTER_CANCEL_URL,
    });
  }

  return rows;
}
