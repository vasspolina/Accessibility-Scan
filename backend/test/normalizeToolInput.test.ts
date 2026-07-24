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
