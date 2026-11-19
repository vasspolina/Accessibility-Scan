import { beforeEach, describe, expect, it } from "vitest";
import { clearAddressCache, normaliseAddress, readAddress } from "../src/services/pilot/readAddress.js";

/**
 * The pilot's address field reads typed text the way a chat would
 * (readAddress.ts). The case that started it: "acsessobilty nl", refused
 * on 18 Nov 2026 with "Enter the address starting with https".
 */

describe("normaliseAddress", () => {
  const cases: Array<[string, string | null, boolean]> = [
    ["acsessobilty nl", "https://acsessobilty.nl", false],
    ["accessibility nl", "https://accessibility.nl", false],
    ["accessibility,nl", "https://accessibility.nl", false],
    ["accessibility, nl", "https://accessibility.nl", false],
    ["accessibility. nl", "https://accessibility.nl", false],
    ["accessibility dot nl", "https://accessibility.nl", false],
    ["accessibility.nl", "https://accessibility.nl", false],
    ["  Accessibility.NL.  ", "https://accessibility.nl", false],
    ["www.example.com", "https://www.example.com", false],
    ["www example com", "https://www.example.com", false],
    ["example co uk", "https://example.co.uk", false],
    ["https://example.com/checkout?step=2", "https://example.com/checkout?step=2", false],
    ["http://example.com/", "http://example.com/", false],
    ["<https://example.com>", "https://example.com", false],
    ["the pay button on bol.com did nothing at all", "https://bol.com", true],
    ["the checkout would not let me pay", null, true],
    ["asdfgh", null, false],
    ["", null, false],
    ["javascript:alert(1)", null, false],
  ];
  it.each(cases)("%j", (typed, url, words) => {
    expect(normaliseAddress(typed)).toEqual({ url, words });
  });

  it("never joins a phrase of four words or more into a host", () => {
    expect(normaliseAddress("I could not log in").url).toBeNull();
  });
});

describe("readAddress", () => {
  beforeEach(() => clearAddressCache());
  const real = new Set(["accessibility.nl", "www.example.com", "bol.com"]);
  const resolve = async (host: string) => real.has(host);

  it("corrects the misspelling with the model, and says it guessed", async () => {
    const seen: string[] = [];
    const guess = async (typed: string) => {
      seen.push(typed);
      return "https://accessibility.nl";
    };
    expect(await readAddress("acsessobilty nl", { resolve, guess })).toEqual({
      url: "https://accessibility.nl", words: false, guessed: true, reached: true,
    });
    expect(seen).toEqual(["acsessobilty nl"]);
  });

  it("does not ask the model about an address that exists", async () => {
    const guess = async () => {
      throw new Error("asked");
    };
    expect(await readAddress("www example com", { resolve, guess })).toEqual({
      url: "https://www.example.com", words: false, guessed: false, reached: true,
    });
  });

  it("keeps the address as typed when the model's answer does not exist either", async () => {
    const guess = async () => "https://made-up.example";
    expect(await readAddress("mynewsite.nl", { resolve, guess })).toEqual({
      url: "https://mynewsite.nl", words: false, guessed: false, reached: false,
    });
  });

  it("keeps the address as typed without a model", async () => {
    const guess = async () => null;
    expect((await readAddress("acsessobilty nl", { resolve, guess })).url).toBe("https://acsessobilty.nl");
  });

  it("does not send a plain description to the model", async () => {
    const guess = async () => {
      throw new Error("asked");
    };
    expect(await readAddress("the checkout would not let me pay", { resolve, guess })).toEqual({
      url: null, words: true, guessed: false, reached: false,
    });
  });

  it("refuses an answer that is not a web address", async () => {
    const guess = async () => "javascript:alert(1)";
    expect((await readAddress("asdfgh", { resolve, guess })).url).toBeNull();
  });
});
