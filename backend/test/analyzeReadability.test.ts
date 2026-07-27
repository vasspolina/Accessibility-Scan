import { describe, it, expect } from "vitest";
import {
  countSyllables,
  scoreReadability,
  evaluateReadability,
} from "../src/services/readability/analyzeReadability.js";

// Prose that is deliberately hard: long sentences, Latinate vocabulary.
const DENSE = (
  "The phenomenological characterisation of consciousness necessitates a " +
  "conceptual differentiation between representational intentionality and " +
  "the qualitative dimensions of experiential states, particularly insofar " +
  "as contemporary functionalist accounts presuppose an equivalence that " +
  "phenomenological investigation demonstrably problematises. "
).repeat(12);

// Ordinary prose: short sentences, common words.
const PLAIN = "We can help you book a place. Tell us your name. We will send a letter. It takes a week. Call us if you need help. ".repeat(24);

describe("countSyllables", () => {
  it("counts ordinary words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("running")).toBe(2);
    expect(countSyllables("beautiful")).toBe(3);
  });

  it("never returns zero for a real word", () => {
    for (const w of ["a", "the", "queue", "rhythm", "strengths"]) {
      expect(countSyllables(w)).toBeGreaterThanOrEqual(1);
    }
  });

  it("ignores punctuation and returns zero for non-words", () => {
    expect(countSyllables("hello,")).toBe(2);
    expect(countSyllables("—")).toBe(0);
  });
});

describe("scoreReadability", () => {
  it("returns null when there is too little text to be meaningful", () => {
    expect(scoreReadability("Short and sweet.")).toBeNull();
  });

  it("scores dense prose harder than plain prose", () => {
    const dense = scoreReadability(DENSE)!;
    const plain = scoreReadability(PLAIN)!;
    expect(dense.grade).toBeGreaterThan(plain.grade);
    expect(dense.ease).toBeLessThan(plain.ease);
  });

  it("refuses text that is not continuous prose", () => {
    // A page of link text and headlines has almost no full stops, so the
    // sentence count collapses to one and every ratio explodes. Measured on
    // the GOV.UK homepage: 351 words per sentence and a confident "grade
    // 144". Refusing is the only honest answer — there is no prose to judge.
    const linkIndex = "Benefits Births deaths marriages Business Childcare Citizenship Crime Disabled ".repeat(30);
    expect(scoreReadability(linkIndex)).toBeNull();
  });

  it("still scores prose that happens to have long sentences", () => {
    // The guard must reject fragment lists, not merely wordy writing.
    const wordy = "This sentence goes on for a considerable length and keeps adding further clauses which the reader must hold in mind before reaching the end of it at last. ".repeat(20);
    const s = scoreReadability(wordy);
    expect(s).not.toBeNull();
    expect(s!.words / s!.sentences).toBeGreaterThan(20);
  });
});

describe("evaluateReadability", () => {
  it("reports dense English prose as advisory AAA", () => {
    const [f] = evaluateReadability({ text: DENSE, lang: "en" });
    expect(f).toBeDefined();
    expect(f.ruleId).toBe("readability-dense-prose");
    expect(f.wcagCriterion).toBe("3.1.5");
    // AAA keeps it out of the score, exactly like tap targets. Anything else
    // would invent a legal duty out of a Level AAA criterion.
    expect(f.wcagLevel).toBe("AAA");
    expect(f.severity).toBe("minor");
  });

  it("says nothing about plainly written English", () => {
    expect(evaluateReadability({ text: PLAIN, lang: "en" })).toEqual([]);
  });

  it("does not judge a page that is not in English", () => {
    // Flesch was derived from English and its syllable model does not carry
    // over; a German or French score is a number, not an answer.
    expect(evaluateReadability({ text: DENSE, lang: "de" })).toEqual([]);
    expect(evaluateReadability({ text: DENSE, lang: "fr-ca" })).toEqual([]);
    expect(evaluateReadability({ text: DENSE, lang: "" })).toEqual([]);
  });

  it("accepts regional English tags", () => {
    expect(evaluateReadability({ text: DENSE, lang: "en-gb" })).toHaveLength(1);
  });

  it("survives a missing signal", () => {
    expect(evaluateReadability(undefined as never)).toEqual([]);
    expect(evaluateReadability({ text: "", lang: "en" })).toEqual([]);
  });
});
