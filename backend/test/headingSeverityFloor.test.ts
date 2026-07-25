import { describe, it, expect } from "vitest";
import { applyHeadingSeverityFloor } from "../src/services/merge/mergeFindings.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "x",
    source: "automated",
    severity: "moderate",
    category: "accessibility",
    selector: "h2",
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

const sev = (fs: AccessibilityFinding[]) => fs.map((f) => f.severity);

describe("applyHeadingSeverityFloor — axe findings", () => {
  it.each(["empty-heading", "heading-order", "p-as-heading", "page-has-heading-one"])(
    "raises %s to serious",
    (ruleId) => {
      expect(sev(applyHeadingSeverityFloor([finding({ ruleId })]))).toEqual(["serious"]);
    }
  );

  it("raises a minor heading finding too", () => {
    expect(sev(applyHeadingSeverityFloor([finding({ ruleId: "heading-order", severity: "minor" })]))).toEqual(
      ["serious"]
    );
  });

  it("leaves non-heading rules alone", () => {
    const out = applyHeadingSeverityFloor([
      finding({ ruleId: "color-contrast" }),
      finding({ ruleId: "link-name", severity: "minor" }),
    ]);
    expect(sev(out)).toEqual(["moderate", "minor"]);
  });
});

// The floor only ever raises. A judgement that something is worse than
// serious must survive.
describe("applyHeadingSeverityFloor — never lowers", () => {
  it("leaves a critical heading finding critical", () => {
    expect(
      sev(applyHeadingSeverityFloor([finding({ ruleId: "empty-heading", severity: "critical" })]))
    ).toEqual(["critical"]);
  });

  it("leaves an already-serious finding untouched", () => {
    expect(
      sev(applyHeadingSeverityFloor([finding({ ruleId: "empty-heading", severity: "serious" })]))
    ).toEqual(["serious"]);
  });
});

describe("applyHeadingSeverityFloor — AI findings", () => {
  const ai = (title: string, description = "d") =>
    finding({ source: "ai-review", ruleId: undefined, title, description });

  it("raises an AI finding about heading structure", () => {
    expect(sev(applyHeadingSeverityFloor([ai("Heading levels jump from H1 to H3")]))).toEqual([
      "serious",
    ]);
  });

  it("matches the word in the description when the title doesn't have it", () => {
    expect(
      sev(applyHeadingSeverityFloor([ai("Overlay menu has no structure", "There are no headings.")]))
    ).toEqual(["serious"]);
  });

  it("matches the singular and the plural", () => {
    expect(sev(applyHeadingSeverityFloor([ai("The heading is empty")]))).toEqual(["serious"]);
    expect(sev(applyHeadingSeverityFloor([ai("Headings are missing")]))).toEqual(["serious"]);
  });

  // The precision case this exists for: a table's column headers are also
  // called headings, but they don't carry page navigation.
  it.each(["Table heading is missing", "Column heading not marked up", "Row heading unclear"])(
    "does not raise %s",
    (title) => {
      expect(sev(applyHeadingSeverityFloor([ai(title)]))).toEqual(["moderate"]);
    }
  );

  it("does not match a word that merely contains 'heading'", () => {
    // "subheadings" is not a standalone word match.
    expect(sev(applyHeadingSeverityFloor([ai("The subheadings are fine")]))).toEqual(["moderate"]);
  });

  // Accepted trade-off, pinned so it's a known behaviour rather than a
  // surprise: "heading" used as an ordinary verb would also be raised. The
  // asymmetry is deliberate — a false positive over-weights one finding, while
  // a false negative defeats the whole point of the floor. Tighten this only
  // if real reports start showing it.
  it("over-matches 'heading' used as a verb, which is preferred to missing a real one", () => {
    expect(sev(applyHeadingSeverityFloor([ai("Users are heading to the checkout")]))).toEqual([
      "serious",
    ]);
  });

  it("ignores an automated finding with no matching rule id, even if it mentions headings", () => {
    // Only AI findings fall back to text — an axe rule not in the set is a
    // different rule, whatever its wording happens to say.
    const out = applyHeadingSeverityFloor([
      finding({ ruleId: "landmark-one-main", description: "no headings here" }),
    ]);
    expect(sev(out)).toEqual(["moderate"]);
  });
});

describe("applyHeadingSeverityFloor — scope", () => {
  it("ignores design-clarity and dark-pattern findings", () => {
    const out = applyHeadingSeverityFloor([
      finding({ category: "design-clarity", ruleId: "empty-heading" }),
      finding({ category: "dark-pattern", source: "ai-review", ruleId: undefined, title: "heading" }),
    ]);
    expect(sev(out)).toEqual(["moderate", "moderate"]);
  });

  it("does not mutate the input", () => {
    const input = [finding({ ruleId: "heading-order" })];
    applyHeadingSeverityFloor(input);
    expect(input[0].severity).toBe("moderate");
  });

  it("preserves every other field", () => {
    const [out] = applyHeadingSeverityFloor([
      finding({ ruleId: "heading-order", title: "t", helpUrl: "u", wcagCriterion: "1.3.1" }),
    ]);
    expect(out).toMatchObject({ title: "t", helpUrl: "u", wcagCriterion: "1.3.1", ruleId: "heading-order" });
  });

  it("handles an empty list", () => {
    expect(applyHeadingSeverityFloor([])).toEqual([]);
  });
});
