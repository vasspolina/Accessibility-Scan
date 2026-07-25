import { describe, it, expect } from "vitest";
import { replaceLongDashes } from "../src/services/merge/mergeFindings.js";

describe("replaceLongDashes", () => {
  it("turns a dash joining two clauses into a full stop", () => {
    expect(replaceLongDashes("The link has no text — a listener has no idea where it goes.")).toBe(
      "The link has no text. A listener has no idea where it goes."
    );
  });

  it("turns a dash before a short trailing phrase into a comma", () => {
    // A full stop here would leave a fragment.
    expect(replaceLongDashes("Text is too small — under 12px.")).toBe(
      "Text is too small, under 12px."
    );
  });

  it("capitalises the new sentence", () => {
    expect(replaceLongDashes("Buttons are unlabelled — people cannot tell what they do.")).toBe(
      "Buttons are unlabelled. People cannot tell what they do."
    );
  });

  it("handles an en dash the same way", () => {
    expect(replaceLongDashes("The form fails – nobody can complete it today.")).toBe(
      "The form fails. Nobody can complete it today."
    );
  });

  it("replaces an unspaced dash with a comma rather than deleting it", () => {
    // Deleting would run the words together.
    expect(replaceLongDashes("small—unreadable")).toBe("small, unreadable");
  });

  it("handles more than one dash in a sentence", () => {
    const out = replaceLongDashes("A — B — C is the order.");
    expect(out).not.toMatch(/[—–]/);
  });

  it("leaves text with no dash untouched", () => {
    const text = "The heading is empty, so it tells a listener nothing.";
    expect(replaceLongDashes(text)).toBe(text);
  });

  it("leaves hyphens alone", () => {
    const text = "Use a well-known pattern for the drop-down.";
    expect(replaceLongDashes(text)).toBe(text);
  });

  it("never leaves a long dash behind", () => {
    const samples = [
      "One — two.",
      "One—two.",
      "One – two three four five.",
      "Trailing dash —",
      "— leading dash",
    ];
    for (const s of samples) expect(replaceLongDashes(s)).not.toMatch(/[—–]/);
  });

  it("does not leave doubled punctuation or stray spaces", () => {
    const out = replaceLongDashes("The box is fixed — text spills out of it entirely.");
    expect(out).not.toMatch(/\s,|,,|\s{2,}|\s\./);
  });

  it("handles an empty string", () => {
    expect(replaceLongDashes("")).toBe("");
  });
});
