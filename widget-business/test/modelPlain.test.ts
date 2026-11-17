import { afterEach, describe, expect, it } from "vitest";
import type { AccessibilityFinding } from "../src/api/scanClient";
import { setLang } from "../src/lib/i18n";
import { findingFix, findingTitle, modelPlain } from "../src/lib/modelPlain";
import { plainForRule } from "../src/lib/wcagPlain";

const base: AccessibilityFinding = {
  id: "1",
  source: "automated",
  severity: "critical",
  category: "accessibility",
  selector: "img",
  description: "Images must have alternate text",
  suggestedFix: "Fix any of the following: Element does not have an alt attribute",
  ruleId: "image-alt",
} as AccessibilityFinding;

const worded = {
  title: "The team photos have no description",
  explanation: "A screen reader says only the file name for each team photo.",
  fix: "Give each team photo a short alt text naming who is in it.",
  model: "qwen2.5:7b-instruct",
  lang: "en",
};

afterEach(() => setLang("en"));

describe("the model's plain words", () => {
  it("come first when written in the reader's language", () => {
    const f = { ...base, plain: worded };
    expect(findingTitle(f)).toBe(worded.title);
    expect(findingFix(f)).toBe(worded.fix);
  });

  it("give way to the hand-written copy when written in another language", () => {
    setLang("de");
    const f = { ...base, plain: worded };
    expect(modelPlain(f)).toBeUndefined();
    expect(findingTitle(f)).toBe(plainForRule("image-alt")?.plain);
  });

  it("leave the hand-written copy, then axe's text, where there is none", () => {
    expect(findingTitle(base)).toBe(plainForRule("image-alt")?.plain);
    expect(findingTitle({ ...base, ruleId: "no-such-rule" })).toBe(base.description);
    expect(findingFix({ ...base, ruleId: "no-such-rule" })).toBe(base.suggestedFix);
  });
});
