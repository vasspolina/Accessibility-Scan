import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Reading level — WCAG 3.1.5 (Level AAA).
//
// Advisory, and excluded from the score, exactly as tap targets are. AAA is
// not required by any law this report speaks to, and saying a site "fails"
// for writing densely would be the overclaim this project refuses. But it is
// worth saying: plain language is the accessibility work with the widest
// reach, helping people with cognitive disabilities, anyone reading in a
// second language, and everyone in a hurry on a phone.
//
// Two honest limits are built in rather than glossed over.
//
// The formulas are English-only. Flesch and Flesch–Kincaid were derived from
// English text and their syllable model does not transfer — German compounds
// and French elisions produce numbers that look authoritative and mean
// nothing. So a page that does not declare an English `lang` is not scored at
// all, and says so, rather than being given a wrong answer.
//
// And they are crude. They count syllables and sentence lengths, which is a
// proxy for difficulty rather than a measure of it: a short sentence of
// jargon scores well and reads badly. The threshold below is set high enough
// that only genuinely dense prose trips it.

export interface ReadabilitySignals {
  /** Set when the probe could not run at all, rather than finding no prose. */
  failed?: boolean;
  /** Prose from the main content, capped. Empty when there was too little. */
  text: string;
  /** The document's declared language, lowercased; "" when absent. */
  lang: string;
}

export interface ReadabilityScore {
  words: number;
  sentences: number;
  syllables: number;
  /** Flesch–Kincaid US grade level. */
  grade: number;
  /** Flesch Reading Ease, 0–100, higher is easier. */
  ease: number;
}

/**
 * Vowel-group syllable count. A heuristic, and the standard one: it is what
 * every implementation of these formulas uses, because English spelling has
 * no reliable rule. Wrong on individual words, close enough over a page.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "") // silent endings
    .replace(/^y/, "");
  // A run of adjacent vowels is one group however long it is. Capping the run
  // at two characters splits "beau" into "ea" + "u" and makes "beautiful"
  // four syllables instead of three, inflating every score a little.
  const groups = trimmed.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Pure and deterministic. Returns null when there is too little to measure. */
export function scoreReadability(text: string, minWords = 200): ReadabilityScore | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  // Sentence ends at . ! ? — abbreviations inflate the count slightly, which
  // makes the result flattering rather than harsh, the safer direction here.
  const sentences = (clean.match(/[.!?]+(?=\s|$)/g) ?? []).length || 1;
  const wordList = clean.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const words = wordList.length;
  if (words < minWords) return null;

  // Refuse to score anything that is not continuous prose. A page of link
  // text, headlines and teasers has almost no full stops, so the sentence
  // count collapses towards one and every ratio in the formula explodes.
  // Measured: the GOV.UK homepage is a link index and came out at 351 words
  // per sentence and "grade 144", and the Guardian's front page at 126 — both
  // numbers presented with total confidence and no meaning whatsoever. Real
  // prose on the same run sat between 15 and 25.
  //
  // Returning null is the right answer rather than a fallback guess: these
  // pages have no prose to judge, so there is nothing to say about them.
  if (words / sentences > 45) return null;

  let syllables = 0;
  for (const w of wordList) syllables += countSyllables(w);

  const wps = words / sentences;
  const spw = syllables / words;
  return {
    words,
    sentences,
    syllables,
    grade: 0.39 * wps + 11.8 * spw - 15.59,
    ease: 206.835 - 1.015 * wps - 84.6 * spw,
  };
}

/**
 * Grade level at which this reports. WCAG 3.1.5 asks for supplements above
 * "lower secondary education", roughly grade 9, but reporting everything over
 * that would flag most professional writing on the web and become noise. This
 * sits at first-year-university prose, where the advice is worth acting on.
 */
const GRADE_THRESHOLD = 14;

export function evaluateReadability(signals: ReadabilitySignals): AccessibilityFinding[] {
  if (!signals?.text) return [];
  // English only. See the note at the top: a Flesch score for German is a
  // number, not an answer.
  if (!/^en\b|^en-/.test(signals.lang || "")) return [];

  const score = scoreReadability(signals.text);
  if (!score || score.grade < GRADE_THRESHOLD) return [];

  const years = Math.round(score.grade);
  return [
    {
      id: randomUUID(),
      source: "automated",
      severity: "minor",
      category: "design-clarity",
      wcagCriterion: "3.1.5",
      // AAA, so it never touches the score and is badged as advanced rather
      // than required. Saying otherwise would invent a legal duty.
      wcagLevel: "AAA",
      selector: "main",
      description: `The writing on this page needs about ${years} years of schooling to read comfortably — roughly first-year university. Measured over ${score.words} words, averaging ${Math.round(score.words / score.sentences)} words a sentence. Nobody reads a page like this closely: people scan it, miss things, and some give up. It is not a legal requirement, and it is the change with the widest reach of anything in this report.`,
      suggestedFix:
        "Shorten sentences first — one idea each, and around 15 to 20 words. Then swap the longest words for ordinary ones where an ordinary one exists. Put what the reader needs to do at the top rather than after the background. GOV.UK writes at about a nine-year-old's reading age on purpose, and it is not a simple site; it is a well-written one.",
      ruleId: "readability-dense-prose",
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/reading-level.html",
    },
  ];
}
