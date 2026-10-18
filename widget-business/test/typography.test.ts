import { describe, it, expect } from "vitest";
import { __test, CAPS_RUN } from "../src/lib/typography";

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

const { smarten } = __test;

describe("smarten: the chat's punctuation (Hochuli, p.36–40)", () => {
  const DASH = "—";
  it("sets single marks first, the apostrophe, the close em dash and the ellipsis in English", () => {
    expect(smarten(`It is announced as "Cookie settings, dialog" - and then nothing... Don't wait.`, "en")).toBe(
      `It is announced as ‘Cookie settings, dialog’${DASH}and then nothing… Don’t wait.`
    );
    expect(smarten("a -- b", "en")).toBe(`a${DASH}b`);
    expect(smarten("a – b", "en")).toBe(`a${DASH}b`);
    expect(smarten("a — b", "en")).toBe(`a${DASH}b`);
    expect(smarten("a—b", "en")).toBe(`a${DASH}b`);
  });
  it("sets double marks for a quotation inside a quotation (fig. 53)", () => {
    expect(smarten(`He said "it reads 'not stated' there" twice`, "en")).toBe(
      "He said ‘it reads “not stated” there’ twice"
    );
  });
  it("keeps a comma or point outside a short quoted phrase, inside a quoted sentence", () => {
    expect(smarten(`marked as "not stated," which means`, "en")).toBe("marked as ‘not stated’, which means");
    expect(smarten(`She wrote "this is the whole of what it says here."`, "en")).toBe(
      "She wrote ‘this is the whole of what it says here.’"
    );
    expect(smarten(`Did it say "why?" and stop`, "en")).toBe("Did it say ‘why?’ and stop");
  });
  it("closes a span of figures with an en dash and leaves dates and hyphenated words alone (fig. 49)", () => {
    expect(smarten("open 10:00-18:00, pages 10 - 12, 1465-80", "en")).toBe("open 10:00–18:00, pages 10–12, 1465–80");
    expect(smarten("on 2026-10-18 a one-line, 24-hour change at -3", "en")).toBe("on 2026-10-18 a one-line, 24-hour change at -3");
  });
  it("sets 1280x900 with the face's own x between no-break spaces (fig. 52)", () => {
    expect(smarten("at 1280x900 and 390 x 844", "en")).toBe("at 1280 x 900 and 390 x 844");
    expect(smarten("0x1f and 3x faster", "en")).toBe("0x1f and 3x faster");
  });
  it("uses the marks and the spaced en dash of the conversation's language", () => {
    expect(smarten('"Hallo" - ja', "de")).toBe("„Hallo“ – ja");
    expect(smarten('"Bonjour" - oui', "fr")).toBe("« Bonjour » – oui");
    expect(smarten('"Hola" - si', "es")).toBe("«Hola» – si");
  });
  it("sets the French high marks with a narrow no-break space before them", () => {
    expect(smarten("Vraiment? Oui; non! Notes: dix", "fr")).toBe("Vraiment ? Oui ; non ! Notes : dix");
    expect(smarten("à 10:00 demain", "fr")).toBe("à 10:00 demain");
  });
  it("leaves a hyphen inside a word and a minus before a figure alone", () => {
    expect(smarten("one-line change at -3", "en")).toBe("one-line change at -3");
  });
  it("does not turn the apostrophe of a contraction or a year into an opening mark", () => {
    expect(smarten("it's the '90s and don't", "en")).toBe("it\u2019s the \u201990s and don\u2019t");
    expect(smarten("a 'quoted' word", "en")).toBe("a \u2018quoted\u2019 word");
  });
});

describe("CAPS_RUN: abbreviations in capitals", () => {
  const find = (s: string) => [...s.matchAll(CAPS_RUN)].map((m) => m[1]);
  it("finds runs of two or more capitals and figures", () => {
    expect(find("WCAG 2.1 AA and ARIA, not MoMA or iOS or I")).toEqual(["WCAG", "AA", "ARIA"]);
    expect(find("the A11Y and WCAG-EM checks")).toEqual(["A11Y", "WCAG-EM"]);
  });
  it("leaves a capitalised word and a single capital alone", () => {
    expect(find("Fix first. A page. Das Ärgerliche")).toEqual([]);
  });
});
