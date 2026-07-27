import { describe, it, expect } from "vitest";
import { evaluateReadingOrder } from "../src/services/readingOrder/analyzeReadingOrder.js";

describe("evaluateReadingOrder", () => {
  const row = {
    selector: "div.actions",
    reason: "flex-direction: row-reverse",
    firstInDom: "Cancel",
    firstOnScreen: "Submit",
  };

  it("returns nothing when no row was reordered", () => {
    expect(evaluateReadingOrder({ reorderedRows: [] })).toEqual([]);
  });

  it("reports a reordered row as WCAG 2.4.3 Level A", () => {
    const [f] = evaluateReadingOrder({ reorderedRows: [row] });
    expect(f.ruleId).toBe("reading-order-mismatch");
    expect(f.wcagCriterion).toBe("2.4.3");
    expect(f.wcagLevel).toBe("A");
    expect(f.severity).toBe("serious");
    expect(f.selector).toBe("div.actions");
  });

  it("names both controls and the CSS responsible", () => {
    // The finding has to be actionable without opening devtools: which two
    // things are the wrong way round, and what moved them.
    const [f] = evaluateReadingOrder({ reorderedRows: [row] });
    expect(f.description).toContain("Cancel");
    expect(f.description).toContain("Submit");
    expect(f.description).toContain("flex-direction: row-reverse");
    expect(f.suggestedFix).toContain("flex-direction: row-reverse");
  });

  it("reports each reordered row separately", () => {
    const second = { ...row, selector: "nav.main", reason: "order: -1" };
    expect(evaluateReadingOrder({ reorderedRows: [row, second] })).toHaveLength(2);
  });

  it("survives a missing signal rather than throwing", () => {
    // The probe returns nothing when it fails, and an older cached render
    // result may not carry the field at all.
    expect(evaluateReadingOrder(undefined as never)).toEqual([]);
    expect(evaluateReadingOrder({} as never)).toEqual([]);
  });
});
