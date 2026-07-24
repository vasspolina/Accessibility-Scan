import { describe, it, expect } from "vitest";
import { stripScreenshotReferences } from "../src/services/merge/mergeFindings.js";

// The model sees a screenshot; the site owner reading the report does not.
// Any reference to it points at something that isn't on their screen.
describe("stripScreenshotReferences", () => {
  it("drops a whole parenthetical about the screenshot", () => {
    const out = stripScreenshotReferences(
      "The wordmark overlaps the hero photo (see screenshot: huge black text 'sakad' cuts across the photo)."
    );
    expect(out).toBe("The wordmark overlaps the hero photo.");
    expect(out).not.toMatch(/screenshot/i);
  });

  it("removes a 'the screenshot shows' lead-in", () => {
    expect(stripScreenshotReferences("The screenshot shows the overlay covering the menu.")).toBe(
      "the overlay covering the menu."
    );
  });

  it("removes an 'in the screenshot' aside", () => {
    const out = stripScreenshotReferences("The button in the screenshot has no visible label.");
    expect(out).toBe("The button has no visible label.");
  });

  it("removes 'visible in the screenshot'", () => {
    const out = stripScreenshotReferences("The banner, visible in the screenshot, covers the page.");
    expect(out).not.toMatch(/screenshot/i);
    expect(out).toMatch(/covers the page/);
  });

  it("leaves prose with no screenshot reference untouched", () => {
    const text = "The newsletter field has no visible label, so its purpose is unclear.";
    expect(stripScreenshotReferences(text)).toBe(text);
  });

  it("does not mangle the word 'screen reader'", () => {
    const text = "Screen reader users hear only 'link' with no destination.";
    expect(stripScreenshotReferences(text)).toBe(text);
  });

  it("collapses the double spaces a removal leaves behind", () => {
    expect(stripScreenshotReferences("The logo (see screenshot) overlaps the photo.")).toBe(
      "The logo overlaps the photo."
    );
  });

  it("handles plural 'screenshots'", () => {
    expect(stripScreenshotReferences("Overlapping text (screenshots confirm this).")).not.toMatch(
      /screenshot/i
    );
  });
});
