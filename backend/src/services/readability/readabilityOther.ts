// Reading ease for German, Spanish and French: the three other languages the
// report ships in. Each uses the adaptation of Flesch published for that
// language, because the English constants and the English syllable counter
// give numbers that look authoritative and mean nothing outside English
// (see analyzeReadability.ts).
//
//   German   Amstad (1978):          180 − ASL − 58.5 × ASW
//   Spanish  Szigriszt-Pazos (1993): 206.835 − 62.3 × ASW − ASL
//            (INFLESZ, Barrio-Cantalejo et al. 2008, gives its bands)
//   French   Kandel & Moles (1958):  207 − 1.015 × ASL − 73.6 × ASW
//
// ASL is words per sentence, ASW syllables per word. All three read like
// Flesch: 0 to 100, higher is easier. The bar is the band each scale names
// for academic or specialist text: under 30 for Amstad ("sehr schwer") and
// Kandel–Moles ("très difficile"), under 40 for INFLESZ ("muy difícil"), whose
// bands sit higher. That is where the English threshold (Flesch–Kincaid grade
// 14, first-year university) sits too.
//
// The syllable counters are heuristics, like the English one: a run of
// vowels is one syllable, corrected for each language's clearest rule (a
// Spanish hiatus between two strong vowels, a French silent final e). Wrong
// on single words, close over a page, which is all a reading-ease score asks.

export type OtherLanguage = "de" | "es" | "fr";

export const OTHER_FORMULAS: Record<OtherLanguage, { name: string; language: string; hardBelow: number }> = {
  de: { name: "Amstad's Flesch scale", language: "German", hardBelow: 30 },
  es: { name: "the Szigriszt-Pazos (INFLESZ) scale", language: "Spanish", hardBelow: 40 },
  fr: { name: "the Kandel–Moles scale", language: "French", hardBelow: 30 },
};

export interface OtherScore {
  words: number;
  sentences: number;
  syllables: number;
  ease: number;
}

export function languageOf(lang: string): OtherLanguage | null {
  const m = lang.toLowerCase().match(/^(de|es|fr)(?:-|$)/);
  return m ? (m[1] as OtherLanguage) : null;
}

const LETTERS = /[^a-zäöüßàâæçéèêëîïôœùûüÿáíñóú]/g;

/** German: vowel groups (ä, ö, ü and y count), so ei, ie, au, eu and äu are one. */
export function syllablesDe(word: string): number {
  const w = word.toLowerCase().replace(LETTERS, "");
  if (!w) return 0;
  return Math.max(1, (w.match(/[aeiouyäöü]+/g) ?? []).length);
}

/**
 * Spanish: a weak vowel (i, u) beside another vowel is a diphthong, one
 * syllable; two strong vowels (a, e, o, or an accented í, ú) side by side are
 * a hiatus, two. A y at the end of a word after a vowel (hoy, muy) is part of
 * that vowel's syllable.
 */
export function syllablesEs(word: string): number {
  const w = word.toLowerCase().replace(LETTERS, "").replace(/(?<=[aeiouáéíóú])y$/, "i");
  if (!w) return 0;
  const groups = w.match(/[aeiouáéíóúü]+/g) ?? [];
  let n = 0;
  for (const g of groups) {
    n += 1;
    for (let i = 1; i < g.length; i++) {
      const strong = (c: string) => /[aeoáéóíú]/.test(c);
      if (strong(g[i - 1]) && strong(g[i])) n += 1;
    }
  }
  return Math.max(1, n);
}

/**
 * French: vowel groups, less a silent final e or es in a word of more than
 * one group (porte, portes), plus one where an accented é meets the next
 * vowel (créa, réel), which French always splits.
 */
export function syllablesFr(word: string): number {
  let w = word.toLowerCase().replace(LETTERS, "");
  if (!w) return 0;
  const before = (w.match(/[aeiouyàâæéèêëîïôœùûüÿ]+/g) ?? []).length;
  if (before > 1) w = w.replace(/(?<=[^aeiouyàâæéèêëîïôœùûüÿ])es?$/, "");
  const groups = w.match(/[aeiouyàâæéèêëîïôœùûüÿ]+/g) ?? [];
  let n = groups.length;
  for (const g of groups) n += (g.match(/é(?=[aeiouàâèêîôû])/g) ?? []).length;
  return Math.max(1, n);
}

const COUNTERS: Record<OtherLanguage, (w: string) => number> = { de: syllablesDe, es: syllablesEs, fr: syllablesFr };

/** Pure. Null when there is too little prose, or what there is is not prose (the English rules). */
export function scoreOtherLanguage(text: string, language: OtherLanguage, minWords = 200): OtherScore | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  // ¿ and ¡ open a Spanish sentence; only the closing marks end one.
  const sentences = (clean.match(/[.!?…]+(?=\s|$)/g) ?? []).length || 1;
  const wordList = clean.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const words = wordList.length;
  if (words < minWords) return null;
  // A page of links and headlines, not prose: see scoreReadability.
  if (words / sentences > 45) return null;
  let syllables = 0;
  for (const w of wordList) syllables += COUNTERS[language](w);
  const asl = words / sentences;
  const asw = syllables / words;
  const ease =
    language === "de" ? 180 - asl - 58.5 * asw : language === "es" ? 206.835 - 62.3 * asw - asl : 207 - 1.015 * asl - 73.6 * asw;
  return { words, sentences, syllables, ease };
}
