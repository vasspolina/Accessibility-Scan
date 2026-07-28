import { describe, it, expect } from "vitest";
import { labelNamesSomething } from "../src/components/FindingGroup";

describe("labelNamesSomething", () => {
  // The case it was reported on: a card whose entire affected-element list
  // read "Heading", under a description that had already said far more.
  it("rejects a label that names only a category of thing", () => {
    for (const label of [
      "Heading",
      "Element",
      "Block of text",
      "Text",
      "Section",
      "Link",
      "Button",
      "Image",
    ]) {
      expect(labelNamesSomething(label), label).toBe(false);
    }
  });

  it("accepts a label that points at a particular thing", () => {
    for (const label of [
      "“Toggle search” button",
      "“Read more” link to Major partnerships",
      "Email field",
      "Servicenavigation",
      "“Kho Liang Ie” heading",
    ]) {
      expect(labelNamesSomething(label), label).toBe(true);
    }
  });

  it("is not fooled by surrounding whitespace", () => {
    expect(labelNamesSomething("  Heading ")).toBe(false);
  });
});
