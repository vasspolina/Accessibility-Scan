import { randomUUID } from "node:crypto";
import type { DomSignals } from "../render/renderPage.js";
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
 * Pure and deterministic — one grouped finding per rule, consistent with the
 * other component/typography/motion layers.
 */
export function evaluateDialogs(dialogs: Dialog[]): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
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
