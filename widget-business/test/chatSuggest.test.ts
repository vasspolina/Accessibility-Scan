import { describe, it, expect } from "vitest";
import { addressToConfirm, tabSuggestion } from "../src/lib/chatSuggest";

describe("addressToConfirm", () => {
  it("finds the address a closing question asks about", () => {
    expect(addressToConfirm("Did you mean accessibility.nl?")).toBe("accessibility.nl");
    expect(addressToConfirm("I couldn't reach that. Did you mean https://www.example.org/about?")).toBe(
      "https://www.example.org/about"
    );
    expect(addressToConfirm("Meinten Sie barrierefrei.de?")).toBe("barrierefrei.de");
  });
  it("stays silent on statements, figures and questions about more than one site", () => {
    expect(addressToConfirm("I checked accessibility.nl.")).toBeNull();
    expect(addressToConfirm("Is a contrast of 4.5:1 enough?")).toBeNull();
    expect(addressToConfirm("Did you mean example.com or example.org?")).toBeNull();
    expect(addressToConfirm("What should I check next?")).toBeNull();
  });
});

describe("tabSuggestion", () => {
  const prompts = ["Which images on this page need alt text?", "Is the text easy to read?"];
  it("offers the yes to a pending address when nothing is typed", () => {
    expect(tabSuggestion("", { confirmReply: "Yes, check a.nl", prompts })).toBe("Yes, check a.nl");
    expect(tabSuggestion("", { confirmReply: null, prompts })).toBeNull();
  });
  it("finishes an opening question from what is typed, ignoring case", () => {
    expect(tabSuggestion("which im", { confirmReply: null, prompts })).toBe(prompts[0]);
    expect(tabSuggestion("Ye", { confirmReply: "Yes, check a.nl", prompts })).toBe("Yes, check a.nl");
  });
  it("offers nothing for one letter, a finished line or no match", () => {
    expect(tabSuggestion("i", { confirmReply: null, prompts })).toBeNull();
    expect(tabSuggestion(prompts[1], { confirmReply: null, prompts })).toBeNull();
    expect(tabSuggestion("zzz", { confirmReply: null, prompts })).toBeNull();
  });
});
