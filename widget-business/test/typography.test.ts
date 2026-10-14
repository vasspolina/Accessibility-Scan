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

const { smarten } = __test;

describe("smarten: the chat's punctuation", () => {
  it("sets English quotation marks, the apostrophe, the spaced en dash and the ellipsis", () => {
    expect(smarten(`It is announced as "Cookie settings, dialog" - and then nothing... Don't wait.`, "en")).toBe(
      "It is announced as \u201CCookie settings, dialog\u201D \u2013 and then nothing\u2026 Don\u2019t wait."
    );
    expect(smarten("'quoted' (and \"bracketed\")", "en")).toBe("\u2018quoted\u2019 (and \u201Cbracketed\u201D)");
    expect(smarten("a -- b", "en")).toBe("a \u2013 b");
  });
  it("uses the marks of the conversation's language", () => {
    expect(smarten('"Hallo"', "de")).toBe("\u201EHallo\u201C");
    expect(smarten('"Bonjour"', "fr")).toBe("\u00AB\u202FBonjour\u202F\u00BB");
    expect(smarten('"Hola"', "es")).toBe("\u00ABHola\u00BB");
  });
  it("leaves a hyphen inside a word and a minus before a figure alone", () => {
    expect(smarten("one-line change at -3", "en")).toBe("one-line change at -3");
  });
});
