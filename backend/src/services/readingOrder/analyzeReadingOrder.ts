import { randomUUID } from "node:crypto";
import type { ReadingOrderSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Visual order versus source order — WCAG 2.4.3 Focus Order (Level A).
//
// CSS can move things on screen without moving them in the document, and
// assistive technology follows the document. So a row can read left to right
// while the Tab key walks it right to left, and nothing about the page looks
// wrong until somebody tries to use it without a mouse.
//
// The detection lives in renderPage.collectReadingOrder, which starts from
// the CSS features that can cause it rather than from geometry, and only
// reports controls that share a visual row. The reasoning for both of those
// constraints, and the sites that forced them, is documented there.
//
// This criterion has been the last big Level A gap in the report for a while.
// It was deferred twice for being too false-positive-prone, on the assumption
// that it had to be solved by comparing positions. It did not.

const FOCUS_ORDER_URL = "https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html";

export function evaluateReadingOrder(signals: ReadingOrderSignals): AccessibilityFinding[] {
  return (signals?.reorderedRows ?? []).map((row) => ({
    id: randomUUID(),
    source: "automated" as const,
    // Serious rather than critical: everything is still reachable, and the
    // damage is confusion and misplaced clicks rather than a blocked task.
    // The pair this most often applies to is a Cancel and a Submit button
    // swapped, where the cost of confusion is not small.
    severity: "serious" as const,
    category: "accessibility" as const,
    wcagCriterion: "2.4.3",
    wcagLevel: "A" as const,
    selector: row.selector,
    description: `On this row the keyboard reaches "${row.firstInDom}" first, but "${row.firstOnScreen}" is the one that appears first on screen. CSS (${row.reason}) has reordered them: it moves them on screen without moving them in the page's code. The Tab key follows the code. Someone moving through by keyboard, or with a screen reader, gets them in the opposite order to everyone else.`,
    suggestedFix: `Put the elements in the document in the order they should be read, and let the layout follow. Avoid writing them in one order and rearranging with ${row.reason}. Sometimes the visual order genuinely has to differ, most often in a design that changes at different screen widths. That is what the CSS reading-flow property is being added for, though browser support is not there yet. Until it is, matching the source order to the visual one is the only reliable fix.`,
    ruleId: "reading-order-mismatch",
    helpUrl: FOCUS_ORDER_URL,
  }));
}
