import { randomUUID } from "node:crypto";
import type { DialogKeyboardResult, DomSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Modal / pop-up accessibility, grounded in the WAI-ARIA Authoring Practices
// dialog pattern. Cookie banners, newsletter overlays, and age gates are a
// notorious failure point: an unlabelled "×" close button traps screen-reader
// users with no announced way out, and a plain overlay that isn't marked as a
// dialog leaves assistive tech unaware it appeared at all. axe can't catch
// most of this (a "×" button passes its name check because it has text), so
// this is genuinely additive.

const DIALOG_PATTERN_URL = "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/";

type Dialog = DomSignals["dialogs"][number];

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  category: AccessibilityFinding["category"],
  selector: string,
  description: string,
  suggestedFix: string,
  wcag?: { criterion: string; level: "A" | "AA" }
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category,
    selector,
    description,
    suggestedFix,
    ruleId,
    helpUrl: DIALOG_PATTERN_URL,
    ...(wcag ? { wcagCriterion: wcag.criterion, wcagLevel: wcag.level } : {}),
  };
}

/**
 * What a real keyboard did to a modal that was open when the page loaded.
 *
 * The distinction the probe exists to draw is between a modal that ignores
 * Escape and one that cannot be left at all. Those look identical from the
 * outside and are not remotely the same problem, so the trap is only ever
 * claimed when both halves were observed: Escape did nothing, AND fifteen
 * Tab presses never moved focus out. That combination is a demonstrated
 * failure of 2.1.2, not an inference from one.
 *
 * Where Escape merely does nothing but the keyboard can still walk away, the
 * finding says exactly that and claims no criterion — the ARIA Authoring
 * Practices ask for Escape, but WCAG does not, and a rule that dressed
 * guidance up as a legal duty would be the same overclaim this project
 * refuses everywhere else.
 */
function evaluateDialogKeyboard(results: DialogKeyboardResult[]): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  for (const r of results) {
    const what = r.role ? `This ${r.role}` : "This pop-up";

    if (!r.closedByEscape && !r.focusEscapes) {
      findings.push(
        makeFinding(
          "dialog-keyboard-trap",
          "critical",
          "accessibility",
          r.selector,
          `${what} cannot be escaped with the keyboard. Pressing Escape does not close it, and pressing Tab fifteen times never moved focus back out to the page. Anyone who is not using a mouse arrives here and stops — they cannot dismiss it and they cannot go around it.`,
          "Close the dialog when Escape is pressed, and make sure focus can leave it. This is the single most damaging thing a modal can do, and it usually appears on the cookie or newsletter overlay that every visitor meets first.",
          { criterion: "2.1.2", level: "A" }
        )
      );
      // Nothing further about this element. A trapped dialog usually also
      // failed to take focus and usually has no close button, and listing
      // those underneath "you cannot get out of this" buries the one that
      // matters. One element, one verdict, the worst one.
      continue;
    }

    if (!r.closedByEscape) {
      findings.push(
        makeFinding(
          "dialog-no-escape",
          "moderate",
          "accessibility",
          r.selector,
          `${what} does not close when you press Escape. Focus can still be moved away with Tab, so nobody is stuck, but Escape is the key people reach for first and it does nothing here.`,
          "Listen for the Escape key on the dialog and close it, as the ARIA Authoring Practices dialog pattern describes. It is a few lines, and it is what every keyboard user expects."
        )
      );
    }

    if (!r.focusMovedIn) {
      findings.push(
        makeFinding(
          "dialog-focus-not-moved",
          "serious",
          "accessibility",
          r.selector,
          `${what} appeared without focus being moved into it. Someone using a screen reader is not told it is there, and a keyboard user has to tab through the whole page behind it to reach the thing now covering their screen.`,
          "When the dialog opens, move focus to it — the dialog container itself, or the first control inside it. Remember where focus was, so it can be put back when the dialog closes."
        )
      );
    }

    if (r.closedByEscape && r.focusLostAfterClose) {
      findings.push(
        makeFinding(
          "dialog-focus-lost-on-close",
          "serious",
          "accessibility",
          r.selector,
          `${what} closed on Escape, but focus was left nowhere — it fell back to the top of the document. The next Tab press starts again from the beginning of the page, so anyone who had worked their way down loses their place entirely.`,
          "On close, put focus back on the control that opened the dialog. Where the dialog was open from the start and has no trigger, move focus to the heading or first control of the main content instead, so tabbing carries on from a sensible spot."
        )
      );
    }
  }

  return findings;
}

/**
 * Pure and deterministic — one grouped finding per rule, consistent with the
 * other component/typography/motion layers.
 */
export function evaluateDialogs(
  dialogs: Dialog[],
  keyboard: DialogKeyboardResult[] = []
): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  findings.push(...evaluateDialogKeyboard(keyboard));
  if (dialogs.length === 0) return findings;

  // 1. Close control with no meaningful accessible name (a bare "×"/icon).
  //    The clearest, highest-impact failure — WCAG 4.1.2 Name, Role, Value.
  const unlabelledClose = dialogs.filter((d) => d.closeControl?.present && !d.closeControl.hasAccessibleName);
  if (unlabelledClose.length > 0) {
    findings.push(
      makeFinding(
        "dialog-close-unlabeled",
        "serious",
        "accessibility",
        unlabelledClose[0].selector,
        `A pop-up's close button has no readable label — it's just an "×" or icon (${unlabelledClose.length} pop-up${unlabelledClose.length === 1 ? "" : "s"}). People using a screen reader hear only "button" and can't tell how to dismiss the pop-up, so it traps them.`,
        'Give the close control an accessible name — aria-label="Close" on the button (a bare "×" glyph is announced as "multiplication sign", not "close").',
        { criterion: "4.1.2", level: "A" }
      )
    );
  }

  // 2. A pop-up with no identifiable close control at all.
  const noClose = dialogs.filter((d) => d.closeControl === null && (d.role !== "" || d.isNativeDialog || d.looksLikeModalOverlay));
  if (noClose.length > 0) {
    findings.push(
      makeFinding(
        "dialog-no-close",
        "moderate",
        "design-clarity",
        noClose[0].selector,
        `A pop-up appears to have no obvious close button (${noClose.length} pop-up${noClose.length === 1 ? "" : "s"}). If it can only be dismissed by clicking outside it, keyboard and screen-reader users may be stuck behind it.`,
        "Add a clearly-labelled close button inside the pop-up, and make sure pressing Escape closes it too.",
        undefined
      )
    );
  }

  // 3. Overlay that looks like a modal but isn't marked as a dialog — screen
  //    readers don't announce it or trap focus in it.
  const notMarked = dialogs.filter(
    (d) => d.looksLikeModalOverlay && !d.isNativeDialog && d.role !== "dialog" && d.role !== "alertdialog"
  );
  if (notMarked.length > 0) {
    findings.push(
      makeFinding(
        "dialog-missing-role",
        "moderate",
        "design-clarity",
        notMarked[0].selector,
        `A pop-up overlay isn't marked up as a dialog (${notMarked.length} overlay${notMarked.length === 1 ? "" : "s"}). Assistive technology doesn't announce that it opened, doesn't keep focus inside it, and lets people tab off into the hidden page behind it.`,
        'Add role="dialog" and aria-modal="true" to the overlay, give it an accessible name (aria-label or aria-labelledby), move keyboard focus into it when it opens, and return focus to the trigger when it closes.',
        undefined
      )
    );
  }

  // 4. An explicitly-marked dialog with no accessible name.
  const namelessDialog = dialogs.filter(
    (d) => (d.role === "dialog" || d.role === "alertdialog" || d.isNativeDialog) && !d.hasAccessibleName
  );
  if (namelessDialog.length > 0) {
    findings.push(
      makeFinding(
        "dialog-missing-name",
        "moderate",
        "accessibility",
        namelessDialog[0].selector,
        `A dialog has no accessible name (${namelessDialog.length} dialog${namelessDialog.length === 1 ? "" : "s"}). When it opens, a screen reader announces "dialog" with no indication of what it's for.`,
        "Give the dialog an accessible name with aria-label, or point aria-labelledby at the dialog's visible heading.",
        { criterion: "4.1.2", level: "A" }
      )
    );
  }

  return findings;
}
