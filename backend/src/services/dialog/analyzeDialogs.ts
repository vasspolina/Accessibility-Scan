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
          `${what} cannot be escaped with the keyboard. This was checked directly: pressing Escape did not close it, and pressing Tab fifteen times never moved focus back out to the page.`,
          "Two changes, and it needs both. First, listen for the Escape key and close the dialog. Second, when it closes, put focus back on the page — on the control that opened the dialog, or the main heading if it opened by itself. Note that holding focus inside an open dialog is correct and should stay; the fault is only that there is no way out. If this is a consent or newsletter banner from a third party, the bug is in their code rather than yours, so send them this finding — it is their fix to make.",
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

  // Which dialog to name and photograph. A page often ships several
  // [role="dialog"] elements that stay hidden until something opens them, and
  // naming one of those leaves the reader with a finding they cannot place:
  // no picture is possible, and "Dialog" is all the label there is. Prefer one
  // that was actually on screen.
  const pick = (list: Dialog[]) => (list.find((d) => d.visible) ?? list[0]).selector;

  // When none of them were on screen there is no picture to take and no
  // visible thing to point at, and the report was leaving the reader with an
  // unplaceable card labelled "Dialog". Saying so outright is the fix: it
  // explains the missing screenshot instead of looking like one failed.
  const unseen = (list: Dialog[]) =>
    list.some((d) => d.visible)
      ? ""
      : ` Nothing here was open during the scan — ${list.length === 1 ? "it appears" : "they appear"} when something on the page triggers ${list.length === 1 ? "it" : "them"} — which is why there is no picture.`;

  // 1. Close control with no meaningful accessible name (a bare "×"/icon).
  //    The clearest, highest-impact failure — WCAG 4.1.2 Name, Role, Value.
  const unlabelledClose = dialogs.filter((d) => d.closeControl?.present && !d.closeControl.hasAccessibleName);
  if (unlabelledClose.length > 0) {
    findings.push(
      makeFinding(
        "dialog-close-unlabeled",
        "serious",
        "accessibility",
        pick(unlabelledClose),
        `A pop-up's close button has no readable label — it's just an "×" or icon (${unlabelledClose.length} pop-up${unlabelledClose.length === 1 ? "" : "s"}). People using a screen reader hear only "button" and can't tell how to dismiss the pop-up, so it traps them.${unseen(unlabelledClose)}`,
        'Give the close control an accessible name — aria-label="Close" on the button (a bare "×" glyph is announced as "multiplication sign", not "close").',
        { criterion: "4.1.2", level: "A" }
      )
    );
  }

  // 2. A pop-up with no identifiable close control at all.
  //
  // Visible dialogs only, and that restriction is about honesty rather than
  // pictures. A dialog sitting hidden in the markup may well grow a close
  // button when it opens — plenty are built that way — so calling it closable
  // or not is guessing at markup that does not exist yet. This rule can only
  // speak for pop-ups the visitor was actually shown.
  const noClose = dialogs.filter(
    (d) =>
      d.visible &&
      d.closeControl === null &&
      (d.role !== "" || d.isNativeDialog || d.looksLikeModalOverlay)
  );
  if (noClose.length > 0) {
    findings.push(
      makeFinding(
        "dialog-no-close",
        "moderate",
        // Access, not decoration. Its siblings on this layer -- no Escape, no
        // name, focus never moved -- are all accessibility findings, and a
        // pop-up that cannot be dismissed is the same kind of problem: a
        // keyboard user is left behind it. It sat outside the score only
        // because nothing here can point at a criterion for it.
        "accessibility",
        pick(noClose),
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
        pick(notMarked),
        `A pop-up overlay isn't marked up as a dialog (${notMarked.length} overlay${notMarked.length === 1 ? "" : "s"}). Assistive technology doesn't announce that it opened, doesn't keep focus inside it, and lets people tab off into the hidden page behind it.`,
        'Add role="dialog" and aria-modal="true" to the overlay, give it an accessible name (aria-label or aria-labelledby), move keyboard focus into it when it opens, and return focus to the trigger when it closes.',
        undefined
      )
    );
  }

  // 4. An explicitly-marked dialog with no accessible name. Hidden ones count
  //    here, unlike the close-button rule above: a name is in the markup
  //    whether or not the dialog is on screen, so this can be judged without
  //    seeing it. Only the element named and photographed prefers a visible
  //    one.
  const namelessDialog = dialogs.filter(
    (d) => (d.role === "dialog" || d.role === "alertdialog" || d.isNativeDialog) && !d.hasAccessibleName
  );
  if (namelessDialog.length > 0) {
    findings.push(
      makeFinding(
        "dialog-missing-name",
        "moderate",
        "accessibility",
        pick(namelessDialog),
        // Says what was counted and nothing else. It used to restate the
        // impact paragraph sitting directly beneath it — both explaining that
        // a screen reader announces "dialog" — and led with "accessible
        // name", which is the specification's phrase rather than anybody's.
        `${namelessDialog.length} pop-up${namelessDialog.length === 1 ? " has" : "s have"} nothing in the code naming ${namelessDialog.length === 1 ? "it" : "them"}, so there is no title for software to read out.${unseen(namelessDialog)}`,
        "Add a name to the dialog itself: `aria-label=\"Cookie preferences\"`, or `aria-labelledby` pointing at the id of the heading already inside it. Use the words of that visible heading, so what gets read aloud matches what is on the screen.",
        { criterion: "4.1.2", level: "A" }
      )
    );
  }

  return findings;
}
