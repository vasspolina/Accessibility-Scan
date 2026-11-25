import { describe, expect, it } from "vitest";
import { splitPictureNote } from "../src/components/FindingGroup";

describe("splitPictureNote", () => {
  it("takes the note's lead as the row's label", () => {
    expect(
      splitPictureNote("No picture: the element is there, but its photograph came out blank.")
    ).toEqual({ label: "No picture", body: "The element is there, but its photograph came out blank." });
  });

  it("reads French, with its space before the colon", () => {
    expect(splitPictureNote("Pas d’image : l’élément est bien là.")).toEqual({
      label: "Pas d’image",
      body: "L’élément est bien là.",
    });
  });

  it("keeps a note with no lead whole, without a label", () => {
    expect(splitPictureNote("The photograph came out blank. See: the details.")).toEqual({
      label: "",
      body: "The photograph came out blank. See: the details.",
    });
    expect(splitPictureNote(undefined)).toBeNull();
  });
});
