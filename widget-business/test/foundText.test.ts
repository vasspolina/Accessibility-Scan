import { describe, it, expect } from "vitest";
import { PLAIN_RULE_EXPLANATIONS } from "../src/lib/wcagPlain";

const withFound = Object.entries(PLAIN_RULE_EXPLANATIONS).filter(([, r]) => r.found);

describe("what-we-found text", () => {
  it("covers the common axe rules", () => {
    expect(withFound.length).toBeGreaterThanOrEqual(30);
  });

  // Every axe rule that came back from a sweep of sixteen European government
  // and news sites. Picked from what real pages actually produce rather than
  // written out against the full rule list on spec: these are the ones a
  // reader will meet.
  it("explains every rule a real European site produced", () => {
    const seenInTheWild = [
      "aria-allowed-attr", "aria-allowed-role", "aria-dialog-name", "aria-hidden-focus",
      "aria-prohibited-attr", "aria-required-attr", "aria-required-children",
      "aria-required-parent", "button-name", "color-contrast", "duplicate-id-active",
      "empty-heading", "frame-title", "heading-order", "html-has-lang", "image-alt",
      "landmark-banner-is-top-level", "landmark-no-duplicate-main", "landmark-one-main",
      "landmark-unique", "link-in-text-block", "link-name", "list", "listitem",
      "meta-viewport", "meta-viewport-large", "nested-interactive",
      "page-has-heading-one", "presentation-role-conflict", "region",
      "scrollable-region-focusable", "select-name", "svg-img-alt", "tabindex",
    ];
    for (const id of seenInTheWild) {
      expect(PLAIN_RULE_EXPLANATIONS[id], `${id} has no plain-language explanation`).toBeDefined();
    }
  });

  // These replace axe's requirement text ("Links must have discernible
  // text"), which was being shown under a heading promising the finding. So
  // the one thing they must never do is state a rule instead of a result.
  it("states what was found rather than what is required", () => {
    // Matches the shape axe writes in — a duty placed on the page ("Links
    // must have discernible text", "Elements must meet minimum contrast") —
    // rather than any appearance of the word. A first attempt at this flagged
    // "anyone who needs to enlarge it on a phone", which describes a person
    // and is exactly the register these are meant to be in.
    const readsAsRule = /\b(must|should)\s+(have|be|meet|contain|provide|include|use)\b/i;
    for (const [id, rule] of withFound) {
      expect(rule.found!(3), `${id} reads as a requirement`).not.toMatch(readsAsRule);
    }
  });

  it("reads correctly for one and for many", () => {
    for (const [id, rule] of withFound) {
      for (const n of [1, 2, 7]) {
        const text = rule.found!(n);
        expect(text.length, `${id} is empty at n=${n}`).toBeGreaterThan(20);
        // The commonest template slip: a count of one followed by a plural.
        if (n === 1) {
          expect(text, `${id} says "1 ...s"`).not.toMatch(/\b1 [a-z]+s\b(?! sit| are)/);
          expect(text, `${id} pairs 1 with a plural verb`).not.toMatch(/\b1 [a-z]+ (have|are|sit)\b/);
        }
      }
      // A count that never appears means the sentence ignores its own input.
      const singular = rule.found!(1);
      const many = rule.found!(9);
      expect(singular === many || many.includes("9"), `${id} drops the count`).toBe(true);
    }
  });

  it("never leaves an unrendered template hole", () => {
    for (const [id, rule] of withFound) {
      expect(rule.found!(4), id).not.toContain("${");
      expect(rule.found!(4), id).not.toContain("undefined");
      expect(rule.found!(4), id).not.toContain("NaN");
    }
  });
});

// "Something on the page works when clicked but cannot be reached with the
// keyboard" was hedging about a thing the scan had measured: it watched the
// element take a click handler and watched Tab never reach it. Naming what
// was found is both more accurate and more confident, and the impact lines
// underneath were already using the right words.
describe("titles name what was found", () => {
  it("never opens with a hedge", () => {
    for (const [id, rule] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
      expect(rule.plain, `${id} hedges`).not.toMatch(/^(something|some thing|stuff)\b/i);
    }
  });
});
