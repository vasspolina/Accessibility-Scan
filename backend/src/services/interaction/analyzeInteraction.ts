import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityReport } from "../../types/report.js";

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];

const MOTION_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation.html";
const KEY_SHORTCUT_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html";
const ON_INPUT_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/on-input.html";
const STATUS_MESSAGE_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html";
const ORIENTATION_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/orientation.html";
const HOVER_FOCUS_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html";
const LANG_OF_PARTS_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html";
const POINTER_CANCEL_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html";

/**
 * Five criteria about how the page responds to being used.
 *
 * None of them leaves a trace in the markup, which is why they sat at
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
  listeners: DomSignals["listeners"],
  /* Live regions and whether the page has anything to operate. Optional so
     an older caller still compiles; absent means the question is skipped
     rather than answered wrongly. */
  status?: {
    liveRegions: number;
    hasControls: boolean;
    orientationLock?: boolean;
    titleTooltips?: number;
    unmarkedScripts?: number;
  }
): UndecidedRow[] {
  const rows: UndecidedRow[] = [];

  /* 4.1.3 Status Messages. Only asked of a page that has controls: a page
     with nothing to operate produces no updates to announce, and asking it
     about live regions would be asking about something that cannot happen.
     Where there are controls and no live region at all, the question is
     worth putting — but it is still a question, because plenty of pages
     change nothing without a reload, and this cannot tell which. */
  if (status && status.hasControls && status.liveRegions === 0) {
    rows.push({
      ruleId: "interaction-no-status-region",
      count: 1,
      help: "Nothing set aside to announce updates",
      helpUrl: STATUS_MESSAGE_URL,
    });
  }

  /* 1.3.4 Orientation. A stylesheet that answers an orientation by rotating
     the page back, or by hiding it behind "please rotate", is the shape of a
     lock. Not proof of one: the same rule can be a legitimate landscape
     treatment for a game or a chart. */
  if (status?.orientationLock) {
    rows.push({
      ruleId: "interaction-orientation-lock",
      count: 1,
      help: "The page may only work one way up",
      helpUrl: ORIENTATION_URL,
    });
  }

  /* 1.4.13 Content on Hover or Focus. The browser's own title tooltip fails
     all three of the criterion's requirements at once: it cannot be
     dismissed with Escape, it cannot be hovered onto to finish reading, and
     it does not persist. It also never appears for anybody using a keyboard
     or a touchscreen, which is the part that costs a reader the content
     outright rather than merely making it awkward. */
  if (status?.titleTooltips) {
    rows.push({
      ruleId: "interaction-title-tooltip",
      count: status.titleTooltips,
      help: "Tooltips only a mouse can see",
      helpUrl: HOVER_FOCUS_URL,
    });
  }

  /* 3.1.2 Language of Parts. Claims only the provable half: a passage in an
     alphabet the declared language does not use is in some other language,
     whatever that language turns out to be. A French passage on an English
     page shares the Latin alphabet and is invisible to this — that half
     still needs a person, and the copy says so. */
  if (status?.unmarkedScripts) {
    rows.push({
      ruleId: "interaction-unmarked-language",
      count: status.unmarkedScripts,
      help: "Passages in another alphabet, unmarked",
      helpUrl: LANG_OF_PARTS_URL,
    });
  }

  if (listeners.motion) {
    rows.push({
      ruleId: "interaction-motion-actuation",
      count: 1,
      help: "The page reacts to the phone being moved",
      helpUrl: MOTION_URL,
    });
  }

  // 2.5.1 Pointer Gestures — same shape as its siblings above: the listener
  // is the observable fact, what it does with the gesture is not, so this is
  // an open question for a person, never a finding.
  if (listeners.gestures) {
    rows.push({
      ruleId: "interaction-gesture-listeners",
      count: 1,
      help: "The page listens for swipes or drags",
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures.html",
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
