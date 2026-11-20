import { describe, it, expect } from "vitest";
import { toPoints } from "../src/lib/cardText";

describe("toPoints", () => {
  it("keeps a short text as one sentence", () => {
    expect(toPoints("Whoever builds your site. Send them this card.")).toBeNull();
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
