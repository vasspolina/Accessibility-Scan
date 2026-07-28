import { describe, it, expect } from "vitest";
import { whatWeFound } from "../src/lib/findingText";
import type { AccessibilityFinding } from "../src/api/scanClient";
import type { PlainRule } from "../src/lib/wcagPlain";

function finding(over: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "1",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "main > p",
    description: "",
    suggestedFix: "",
    ...over,
  } as AccessibilityFinding;
}

describe("whatWeFound", () => {
  // The regression this exists for. An AI finding has no rule id, so no
  // plain-language entry, and its explanation lives in the description. It
  // used to be shown only when a plain entry existed — so this text went to
  // the collapsed technical drawer, or nowhere at all when the finding also
  // had no WCAG criterion. 32 of 80 AI findings across the European sweep
  // reached the reader as a headline and three badges.
  it("shows an AI finding's explanation, which has no rule behind it", () => {
    const f = finding({
      source: "ai-review",
      title: "Refusing cookies means agreeing to pay",
      description:
        "The cookie pop-up gives visitors two options: accept tracking and continue for free, or refuse tracking and be pushed toward a paid subscription.",
    });
    expect(whatWeFound(f, undefined, 1, f.title!)).toBe(f.description);
  });

  it("prefers the rule's own count-aware account when there is one", () => {
    const plain: PlainRule = {
      plain: "Some links have nothing a screen reader can read out.",
      impact: "…",
      found: (n) => `${n} links have no readable text inside.`,
    };
    const f = finding({ ruleId: "link-name", description: "Links must have discernible text" });
    expect(whatWeFound(f, plain, 4, plain.plain)).toBe("4 links have no readable text inside.");
  });

  // The one case where saying nothing is right: repeating the heading
  // immediately below itself.
  it("says nothing when the description is already the title", () => {
    const f = finding({ description: "Buttons and icons are too pale to make out." });
    expect(whatWeFound(f, undefined, 1, f.description)).toBeNull();
  });

  it("says nothing when there is no description at all", () => {
    expect(whatWeFound(finding({ description: "" }), undefined, 1, "A title")).toBeNull();
  });

  // A plain entry without a `found` writer still has to fall through to the
  // description rather than going silent.
  it("falls back to the description when the rule has no account of its own", () => {
    const plain: PlainRule = { plain: "A pop-up has no name in the code.", impact: "…" };
    const f = finding({ ruleId: "aria-dialog-name", description: "1 pop-up has nothing naming it." });
    expect(whatWeFound(f, plain, 1, plain.plain)).toBe("1 pop-up has nothing naming it.");
  });
});
