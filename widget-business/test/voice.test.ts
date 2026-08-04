import { describe, it, expect } from "vitest";
import {
  PLAIN_RULE_EXPLANATIONS,
  PLAIN_RULE_FIXES,
  UNDECIDED_EXPLANATIONS,
} from "../src/lib/wcagPlain";
import { AI_HINT, FIX_KINDS, KEYBOARD_HINT } from "../src/lib/testMethod";

// The voice guide (docs/VOICE.md), enforced rather than requested — the same
// treatment the research lines already get. A guide that lives only in a
// document drifts the first time someone adds a rule in a hurry; these tests
// are what keeps the register stable as the copy grows.

// Every reader-facing string, labelled by where it lives so a failure names
// the exact entry to fix.
function allCopy(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [id, r] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
    out.push([`${id}.plain`, r.plain]);
    out.push([`${id}.impact`, r.impact]);
    if (r.found) out.push([`${id}.found`, r.found(3)]);
    if (r.research) out.push([`${id}.research`, r.research]);
  }
  for (const [id, fix] of Object.entries(PLAIN_RULE_FIXES)) {
    out.push([`fix:${id}`, fix]);
  }
  for (const [id, u] of Object.entries(UNDECIDED_EXPLANATIONS)) {
    out.push([`undecided:${id}.what`, u.what]);
    out.push([`undecided:${id}.ask`, u.ask]);
  }
  for (const [key, kind] of Object.entries(FIX_KINDS)) {
    out.push([`hint:${key}`, kind.hint]);
  }
  out.push(["hint:ai", AI_HINT]);
  out.push(["hint:keyboard", KEYBOARD_HINT]);
  return out;
}

describe("titles", () => {
  // Name the problem in two to six words, sentence case, no trailing stop.
  // A title is a label, not a sentence — the length cap is what stopped the
  // long-sentence titles that wrapped to three lines on a phone.
  it("run two to six words", () => {
    for (const [id, r] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
      const words = r.plain.trim().split(/\s+/);
      expect(words.length, `${id} title has ${words.length} words`).toBeGreaterThanOrEqual(2);
      expect(words.length, `${id} title has ${words.length} words`).toBeLessThanOrEqual(6);
    }
  });

  it("carry no trailing full stop", () => {
    for (const [id, r] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
      expect(r.plain, `${id} title ends with a full stop`).not.toMatch(/\.$/);
    }
  });
});

describe("all reader-facing copy", () => {
  // "Em dashes may replace parentheses, but never more than once per finding
  // block." Counted per string, which is stricter than per block and easier
  // to point at when it fails.
  it("uses at most one em dash per string", () => {
    for (const [id, text] of allCopy()) {
      const dashes = (text.match(/—/g) ?? []).length;
      expect(dashes, `${id} uses ${dashes} em dashes`).toBeLessThanOrEqual(1);
    }
  });

  it("never exclaims", () => {
    for (const [id, text] of allCopy()) {
      expect(text, `${id} exclaims`).not.toMatch(/!/);
    }
  });

  // The guide's translation table, enforced as a ban on the untranslated
  // term. Rule ids are keys, not copy, so they are never scanned here —
  // "scrollable-region-focusable" the id is fine; "focusable" the word in a
  // sentence a site owner reads is not.
  it("never ships untranslated jargon", () => {
    const jargon = /\bprogrammatically\b|\baccessible name\b|\blandmark region/i;
    for (const [id, text] of allCopy()) {
      expect(text, `${id} ships untranslated jargon`).not.toMatch(jargon);
    }
  });

  // The guide asks for sentences under twenty words; this backstop allows a
  // little slack for sentences carrying literal code values, and catches the
  // thirty-word constructions that used to accrete. Splits only where a
  // sentence end is followed by a capital, digit or quote, so "e.g. a" and
  // decimal values never count as boundaries.
  it("keeps sentences readable", () => {
    for (const [id, text] of allCopy()) {
      const sentences = text.split(/(?<=[.?!])\s+(?=["'(A-Z0-9])/);
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        expect(
          words.length,
          `${id} has a ${words.length}-word sentence: "${sentence}"`
        ).toBeLessThanOrEqual(24);
      }
    }
  });
});
