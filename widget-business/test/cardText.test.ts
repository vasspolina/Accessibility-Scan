import { describe, it, expect } from "vitest";
import { cardText, toPoints } from "../src/lib/cardText";

describe("toPoints", () => {
  it("keeps a short text as one sentence", () => {
    expect(toPoints("Whoever builds your site. Copy this card and send it to them.")).toBeNull();
  });

  it("splits a long text into one point per sentence", () => {
    const text =
      "Several featured article images have no alt text at all. These are not decorative flourishes. A screen reader user skips past them without knowing an image was there.";
    expect(toPoints(text)).toEqual([
      "Several featured article images have no alt text at all.",
      "These are not decorative flourishes.",
      "A screen reader user skips past them without knowing an image was there.",
    ]);
  });

  it("never splits inside a criterion number, a ratio or an abbreviation", () => {
    const text =
      "Text at 3.5:1 fails criterion 1.4.3 on every product card in the grid, e.g. the price and the shop name. The minimum is 4.5:1.";
    expect(toPoints(text)).toEqual([
      "Text at 3.5:1 fails criterion 1.4.3 on every product card in the grid, e.g. the price and the shop name.",
      "The minimum is 4.5:1.",
    ]);
  });

  it("keeps one long sentence whole", () => {
    expect(toPoints("a".repeat(150))).toBeNull();
  });
});

describe("cardText", () => {
  const labels = { found: "What we found", todo: "What to do", elements: "Affected elements", more: "Learn more" };

  it("puts the title, the severity and the criterion first, then the parts in order", () => {
    const text = cardText({
      title: "Images have no description",
      severity: "Fix first",
      criterion: "1.1.1",
      found: "3 images have no alt text.",
      todo: ["Describe each image.", "Leave decorative ones empty."],
      elements: ["img.hero", "img.card"],
      more: "https://example.com/rule",
      labels,
    });
    expect(text).toBe(
      [
        "Images have no description",
        "Fix first · WCAG 1.1.1",
        "",
        "What we found:",
        "3 images have no alt text.",
        "",
        "What to do:",
        "- Describe each image.",
        "- Leave decorative ones empty.",
        "",
        "Affected elements:",
        "- img.hero",
        "- img.card",
        "",
        "Learn more: https://example.com/rule",
      ].join("\n")
    );
  });

  it("leaves out the parts a finding does not have", () => {
    expect(cardText({ title: "Title", todo: "Do this.", labels })).toBe("Title\n\nWhat to do:\nDo this.");
  });
});
