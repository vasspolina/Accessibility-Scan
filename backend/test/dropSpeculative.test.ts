import { describe, it, expect } from "vitest";
import { dropSpeculativeFindings } from "../src/services/merge/mergeFindings.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function ai(over: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "x",
    source: "ai-review",
    severity: "moderate",
    category: "dark-pattern",
    selector: "div",
    title: "Cookie banner has no reject button",
    description: "d",
    suggestedFix: "f",
    confidence: "high",
    ...over,
  } as AccessibilityFinding;
}

const titles = (f: AccessibilityFinding[]) => f.map((x) => x.title ?? x.ruleId);

describe("dropSpeculativeFindings", () => {
  it("keeps a confident, plainly stated finding", () => {
    expect(dropSpeculativeFindings([ai()])).toHaveLength(1);
  });

  // The model's own confidence rating was travelling into the report and
  // never being read, so a guess printed exactly like a measured fact.
  it("drops what the model itself was unsure of", () => {
    expect(dropSpeculativeFindings([ai({ confidence: "low" })])).toEqual([]);
    expect(dropSpeculativeFindings([ai({ confidence: "medium" })])).toHaveLength(1);
  });

  // A title is the claim. One that has to hedge has not established anything,
  // whatever confidence came attached — this is the shape that prompted the
  // whole change: "Cookie banner's close icon may not equal rejecting cookies".
  it("drops a hedged headline even at high confidence", () => {
    for (const t of [
      "Cookie banner's close icon may not equal rejecting cookies",
      "Checkout might confuse first-time buyers",
      "This could be a dark pattern",
      "Pricing appears to be hidden",
      "The layout seems inconsistent",
      "Form potentially blocks screen readers",
    ]) {
      expect(dropSpeculativeFindings([ai({ title: t })]), t).toEqual([]);
    }
  });

  // Some genuine faults are conditional, and explaining the condition in the
  // body is honest where a headline of the same shape is not.
  it("allows the description to hedge where the claim itself does not", () => {
    const f = ai({
      title: "Cookie banner has no reject button",
      description: "If the close icon is the only way out, consent may not be validly given.",
    });
    expect(dropSpeculativeFindings([f])).toHaveLength(1);
  });

  it("never touches findings that were measured rather than judged", () => {
    const measured = ai({
      source: "automated",
      confidence: undefined,
      title: undefined,
      ruleId: "color-contrast",
    });
    expect(dropSpeculativeFindings([measured])).toHaveLength(1);
  });

  it("does not mistake a word inside a longer one for a hedge", () => {
    // "Maybelline", "Mayfair", "seemingly" — a bare substring match would
    // silence a finding about a brand name.
    expect(titles(dropSpeculativeFindings([ai({ title: "Mayfair store hours are wrong" })]))).toEqual([
      "Mayfair store hours are wrong",
    ]);
  });

  // Observed on moma.org. The defect was real — the captions do describe
  // colours instead of the paintings — but who wrote them is inferred from
  // style, and the report cannot know whether a person, a tool or a model
  // produced any text on a page. It also puts an accusation in front of an
  // owner that they may simply deny.
  it("drops a claim about who or what wrote the content", () => {
    for (const t of [
      "AI-written image captions describe colours, not the artwork",
      "Auto-generated alt text misses the subject",
      "Machine-generated descriptions repeat the filename",
    ]) {
      expect(dropSpeculativeFindings([ai({ title: t })]), t).toEqual([]);
    }
  });

  // "Another AI-generated caption misses the artwork's name" only parses if
  // you have read a previous card, and the report groups, sorts and filters
  // findings — nothing guarantees one is above it.
  it("drops a title that leans on a finding above it", () => {
    for (const t of ["Another caption misses the artwork's name", "Also blocks keyboard users"]) {
      expect(dropSpeculativeFindings([ai({ title: t })]), t).toEqual([]);
    }
  });

  it("keeps the same observation once it stands on its own", () => {
    const f = ai({ title: "Image captions describe colours, not the artwork" });
    expect(dropSpeculativeFindings([f])).toHaveLength(1);
  });
});
