import { describe, expect, it } from "vitest";
import type { AccessibilityFinding } from "../src/types/report.js";
import {
  attachCodeFixes,
  codeFixKey,
  MAX_CODE_FIXES,
  pickCodeFixCandidates,
  suggestCodeFixes,
  validateCodeFix,
} from "../src/services/aiReview/suggestCodeFix.js";

function finding(over: Partial<AccessibilityFinding>): AccessibilityFinding {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "a.x",
    elementSnippet: '<a href="/cart"></a>',
    description: "Link has no accessible name",
    suggestedFix: "Give the link text",
    ruleId: "link-name",
    ...over,
  };
}

describe("pickCodeFixCandidates", () => {
  it("takes measured findings with a snippet only", () => {
    const picked = pickCodeFixCandidates([
      finding({ id: "a" }),
      finding({ id: "b", source: "ai-review", selector: "b" }),
      finding({ id: "c", elementSnippet: undefined, selector: "c" }),
      finding({ id: "d", category: "design-clarity", selector: "d" }),
      finding({ id: "e", ruleId: "image-alt", selector: "e" }),
      finding({ id: "f", elementSnippet: "<div>" + "x".repeat(2000) + "</div>", selector: "f" }),
    ]);
    expect(picked.map((f) => f.id)).toEqual(["a"]);
  });

  it("puts the worst first and one of each rule before a second of any", () => {
    const picked = pickCodeFixCandidates([
      finding({ id: "minor-1", severity: "minor", ruleId: "r1", selector: "1" }),
      finding({ id: "crit-a", severity: "critical", ruleId: "r2", selector: "2" }),
      finding({ id: "crit-b", severity: "critical", ruleId: "r2", selector: "3" }),
      finding({ id: "mod", severity: "moderate", ruleId: "r3", selector: "4" }),
    ]);
    expect(picked.map((f) => f.id)).toEqual(["crit-a", "mod", "minor-1", "crit-b"]);
  });

  it("is capped and skips the same element twice", () => {
    const many = Array.from({ length: 30 }, (_, i) => finding({ ruleId: `r${i}`, selector: `s${i}` }));
    expect(pickCodeFixCandidates(many)).toHaveLength(MAX_CODE_FIXES);
    expect(pickCodeFixCandidates([finding({ id: "1" }), finding({ id: "2" })])).toHaveLength(1);
  });
});

describe("validateCodeFix", () => {
  const before = '<a href="/cart"></a>';
  it("accepts a real change", () => {
    const fix = validateCodeFix(before, { canFix: true, fixedHtml: '<a href="/cart">Your cart</a>', note: "Added link text." }, "m");
    expect(fix).toEqual({ before, after: '<a href="/cart">Your cart</a>', note: "Added link text.", model: "m" });
  });
  it("drops a declined, empty, unchanged or non-markup answer", () => {
    expect(validateCodeFix(before, { canFix: false, fixedHtml: "<a>x</a>" }, "m")).toBeNull();
    expect(validateCodeFix(before, { canFix: true, fixedHtml: "  " }, "m")).toBeNull();
    expect(validateCodeFix(before, { canFix: true, fixedHtml: '<a  href="/cart" ></a>' }, "m")).toBeNull();
    expect(validateCodeFix(before, { canFix: true, fixedHtml: "Add some text to the link" }, "m")).toBeNull();
  });
  it("drops an answer that grew into something else", () => {
    expect(validateCodeFix(before, { canFix: true, fixedHtml: `<a href="/cart">${"x".repeat(800)}</a>` }, "m")).toBeNull();
  });
  it("never hands over script the element did not already have", () => {
    expect(validateCodeFix(before, { canFix: true, fixedHtml: '<a href="/cart" onclick="go()">Cart</a>' }, "m")).toBeNull();
    expect(validateCodeFix(before, { canFix: true, fixedHtml: '<a href="javascript:go()">Cart</a>' }, "m")).toBeNull();
    expect(validateCodeFix(before, { canFix: true, fixedHtml: '<a href="/cart">Cart</a><script>x()</script>' }, "m")).toBeNull();
  });
  it("sets the note's dashes as spaced en dashes", () => {
    const fix = validateCodeFix(before, { canFix: true, fixedHtml: '<a href="/cart">[where this goes]</a>', note: "Added text—fill it in." }, "m");
    expect(fix?.note).toBe("Added text – fill it in.");
  });
});

describe("attachCodeFixes", () => {
  it("attaches by rule and selector, and only to the snippet it was written for", () => {
    const a = finding({ id: "a" });
    const b = finding({ id: "b", selector: "a.y", elementSnippet: '<a href="/y"></a>' });
    const fixes = new Map([
      [codeFixKey(a), { before: '<a href="/cart"></a>', after: '<a href="/cart">Cart</a>', model: "m" }],
      [codeFixKey(b), { before: '<a href="/other"></a>', after: '<a href="/other">Other</a>', model: "m" }],
    ]);
    expect(attachCodeFixes([a, b], fixes)).toBe(1);
    expect(a.suggestedCode?.after).toBe('<a href="/cart">Cart</a>');
    expect(b.suggestedCode).toBeUndefined();
  });
});

describe("suggestCodeFixes", () => {
  it("does nothing when the AI layer is switched off", async () => {
    const out = await suggestCodeFixes([finding({})], false, "en");
    expect(out.size).toBe(0);
  });
});
