import { describe, it, expect } from "vitest";
import { normalizeToolInput } from "../src/services/aiReview/reviewPage.js";

// The model sometimes returns the findings array as a JSON string rather than
// a real array. The content is right, only the encoding differs — repairing it
// rescues a completed, already-paid-for response instead of discarding it.
describe("normalizeToolInput", () => {
  const finding = {
    severity: "serious",
    category: "accessibility",
    selector: "a.cta",
    description: "Link has no text.",
    suggestedFix: "Give the link readable text.",
    confidence: "high",
  };

  it("parses a stringified findings array into a real array", () => {
    const out = normalizeToolInput({ findings: JSON.stringify([finding]) }) as {
      findings: unknown[];
    };
    expect(Array.isArray(out.findings)).toBe(true);
    expect(out.findings).toEqual([finding]);
  });

  it("handles a stringified empty array", () => {
    const out = normalizeToolInput({ findings: "[]" }) as { findings: unknown[] };
    expect(out.findings).toEqual([]);
  });

  it("leaves a proper array untouched", () => {
    const input = { findings: [finding] };
    expect(normalizeToolInput(input)).toEqual(input);
  });

  it("preserves other keys while repairing findings", () => {
    const out = normalizeToolInput({ findings: "[]", note: "x" }) as Record<string, unknown>;
    expect(out.note).toBe("x");
    expect(out.findings).toEqual([]);
  });

  it("returns unparseable strings untouched so the schema still rejects them", () => {
    const input = { findings: "not json at all" };
    expect(normalizeToolInput(input)).toBe(input);
  });

  it("does not convert a string that decodes to a non-array", () => {
    const input = { findings: '{"a":1}' };
    expect(normalizeToolInput(input)).toBe(input);
  });

  it("passes through non-object input", () => {
    expect(normalizeToolInput(null)).toBeNull();
    expect(normalizeToolInput("x")).toBe("x");
    expect(normalizeToolInput(undefined)).toBeUndefined();
  });

  it("does not mutate the original input", () => {
    const input = { findings: JSON.stringify([finding]) };
    normalizeToolInput(input);
    expect(typeof input.findings).toBe("string");
  });
});

// The failure that actually happened in production: the findings string is
// well-formed enough to read but not to JSON.parse, and an all-or-nothing
// repair threw away the whole review — measured at roughly 40% of attempts.
describe("salvaging a findings string that won't parse", () => {
  const one = (title: string) =>
    `{"severity":"serious","category":"accessibility","selector":"a","title":${JSON.stringify(title)},"description":"d","suggestedFix":"f"}`;

  it("recovers every complete entry when the tail is cut off mid-object", () => {
    const truncated = `[${one("first")},${one("second")},{"severity":"serious","categ`;
    const out = normalizeToolInput({ findings: truncated }) as { findings: unknown[] };
    expect(out.findings).toHaveLength(2);
    expect((out.findings[0] as { title: string }).title).toBe("first");
    expect((out.findings[1] as { title: string }).title).toBe("second");
  });

  it("drops only the malformed entry, keeping its neighbours", () => {
    const broken = `[${one("good one")},{"severity":"serious",,},${one("good two")}]`;
    const out = normalizeToolInput({ findings: broken }) as { findings: unknown[] };
    expect(out.findings).toHaveLength(2);
    expect((out.findings as Array<{ title: string }>).map((f) => f.title)).toEqual([
      "good one",
      "good two",
    ]);
  });

  it("is not fooled by braces inside a description", () => {
    const withBraces = `[${one("press the {more} button")},`;
    const out = normalizeToolInput({ findings: withBraces }) as { findings: unknown[] };
    expect(out.findings).toHaveLength(1);
    expect((out.findings[0] as { title: string }).title).toBe("press the {more} button");
  });

  it("is not fooled by an escaped quote inside a description", () => {
    const withQuote = `[${one('the "buy" button')},`;
    const out = normalizeToolInput({ findings: withQuote }) as { findings: unknown[] };
    expect(out.findings).toHaveLength(1);
    expect((out.findings[0] as { title: string }).title).toBe('the "buy" button');
  });

  it("leaves the input untouched when nothing can be recovered", () => {
    const input = { findings: "not json at all" };
    expect(normalizeToolInput(input)).toBe(input);
  });
});
