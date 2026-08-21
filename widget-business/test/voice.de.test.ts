import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The German voice brief, enforced rather than trusted.
 *
 * The brief's own acceptance test is "read it aloud; if a sentence needs a
 * second breath, cut it" — which no machine can run. What a machine CAN run
 * is everything mechanical in the brief, and those are exactly the rules a
 * translator working sentence by sentence breaks first: the register slips
 * to du, a German technical default reintroduces the passive, an
 * exclamation mark arrives because it is conventional in German UI copy,
 * or a sentence grows a second clause and travels past twenty words.
 *
 * Deliberately NOT checked: noun capitalisation (orthography, not style —
 * the brief says so), and German quotation marks, which the copy already
 * uses correctly and which a naive regex reports as errors.
 */

const FILES = [
  "src/lib/strings.de.ts",
  "src/lib/wcagPlain.de.ts",
  "../backend/src/services/conformance/criteriaText.de.ts",
];

function germanStrings(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
    for (const m of src.matchAll(/:\s*"((?:[^"\\]|\\.)*)"/g)) {
      const v = m[1];
      if (/[äöüßA-Za-z]{4}/.test(v)) out.push([path.basename(f), v]);
    }
  }
  return out;
}

const STRINGS = germanStrings();

describe("German voice: register", () => {
  it("says Sie, never du — in every string, including errors and empty states", () => {
    for (const [file, v] of STRINGS) {
      expect(/\b(du|dich|dir|dein[esrmn]?)\b/i.test(v), `${file}: ${v}`).toBe(false);
    }
  });
});

describe("German voice: forbidden vocabulary", () => {
  const BANNED: Array<[string, RegExp]> = [
    // Consultancy filler.
    ["consultancy filler", /\b(innovativ|ganzheitlich|maßgeschneidert|zukunftssicher)\w*/i],
    ["Lösungen aus einer Hand", /Lösungen aus einer Hand/i],
    // Fear-based selling. German accessibility marketing runs on this, which
    // is precisely why it is banned here.
    ["fear-based selling", /\b(Abmahnwelle|Abmahnung|Bußgeld|Strafzahlung)\w*/i],
    // Overpromise. A site can be konform; none is vollständig barrierefrei.
    ["overpromise", /\b(rechtssicher|garantiert|vollständig barrierefrei)\w*|100\s*%\s*konform/i],
    // Amtsdeutsch: the nominal style the brief exists to counter.
    ["Amtsdeutsch", /\bes erfolgt\b|\bInanspruchnahme\b|\bunter Zuhilfenahme\b/i],
  ];
  for (const [label, re] of BANNED) {
    it(`never uses ${label}`, () => {
      for (const [file, v] of STRINGS) {
        expect(re.test(v), `${file}: ${v}`).toBe(false);
      }
    });
  }
});

describe("German voice: sentences and punctuation", () => {
  /* A colon counts as a sentence break here, and that is a decision rather
     than an accident of the regex. The brief's own acceptance test is "if a
     sentence needs a second breath, cut it", and in German a colon IS that
     breath: "Alles, was Menschen nicht sehen oder hören können: Text, der zu
     blass ist, …" reads as two. The cost is that a writer can satisfy the
     letter by turning a dash into a colon instead of shortening, which
     happened once in the first pass; each half must still stand alone as a
     clause a reader can say in one go. */
  it("keeps every sentence under twenty words", () => {
    for (const [file, v] of STRINGS) {
      for (const s of v.split(/(?<=[.!?:])\s+/)) {
        const words = s.trim().split(/\s+/).filter(Boolean).length;
        expect(words, `${file}: ${words} words — ${s}`).toBeLessThanOrEqual(20);
      }
    }
  });

  it("uses no exclamation points, conventional though they are in German UI", () => {
    for (const [file, v] of STRINGS) {
      expect(v.includes("!"), `${file}: ${v}`).toBe(false);
    }
  });

  it("uses the spaced en dash, not the em dash", () => {
    // House typography per locale: en keeps the em dash, de takes " – ".
    for (const [file, v] of STRINGS) {
      expect(v.includes("—"), `${file}: em dash in ${v}`).toBe(false);
    }
  });

  it("writes dates in long form, never numeric", () => {
    for (const [file, v] of STRINGS) {
      expect(/\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/.test(v), `${file}: ${v}`).toBe(false);
    }
  });

  it("carries no imperial measurement into a German sentence", () => {
    for (const [file, v] of STRINGS) {
      expect(/\b\d+\s?(inch|inches|ft|feet|zoll)\b/i.test(v), `${file}: ${v}`).toBe(false);
    }
  });
});

describe("German voice: one term per concept", () => {
  // The brief: decide once, use site-wide. These are the decisions.
  const DECIDED: Array<[string, RegExp, RegExp]> = [
    ["Prüfung/Scan over Audit", /\bAudit\b/, /\b(Prüfung|Scan)\b/i],
    ["Bericht over Report", /\bReport\b/, /\bBericht\b/i],
  ];
  for (const [label, rejected] of DECIDED.map(([l, r]) => [l, r] as const)) {
    it(`holds ${label}`, () => {
      for (const [file, v] of STRINGS) {
        expect(rejected.test(v), `${file}: ${v}`).toBe(false);
      }
    });
  }
});
