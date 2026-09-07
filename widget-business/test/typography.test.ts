import { describe, it, expect } from "vitest";
import { __test } from "../src/lib/typography";

const N = "\u00A0";
describe("short words stay attached to the next word", () => {
  it("binds one- and two-letter words to what follows, including runs of them", () => {
    expect(__test.bind("they take focus. A page vanishes")).toBe(`they take focus. A${N}page vanishes`);
    expect(__test.bind("go to the shop of my choice")).toBe(`go${N}to${N}the shop of${N}my${N}choice`);
  });
  it("leaves longer words, and a short word with nothing after it, alone", () => {
    expect(__test.bind("nothing here binds")).toBe("nothing here binds");
    expect(__test.bind("ends on a")).toBe(`ends on${N}a`);
  });
});
