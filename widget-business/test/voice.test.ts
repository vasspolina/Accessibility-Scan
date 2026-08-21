import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
    // A fix is either a sentence or a list of steps, and every step is
    // reader-facing copy in its own right — so each is checked separately
    // rather than joined, which would hide a long step inside a long total.
    if (Array.isArray(fix)) fix.forEach((step, i) => out.push([`fix:${id}[${i}]`, step]));
    else out.push([`fix:${id}`, fix]);
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

// The jargon tiers, at file scope because two corpora share them: the copy
// maps below, and the JSX paragraphs at the foot of this file.
const JARGON_EVERYWHERE =
  /\bprogrammatically\b|\baccessible name\b|\blandmark region|\bDOM\b|\bmetadata\b|\bsemantic/i;
const JARGON_OWNER = new RegExp(
  [
    JARGON_EVERYWHERE.source,
    String.raw`\baria[-\s*]`,
    String.raw`\bfocusable\b`,
    String.raw`\bviewport\b`,
    String.raw`\blive region\b`,
    String.raw`\bassistive technolog`,
  ].join("|"),
  "i"
);

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
  //
  // Two tiers, split on who the sentence is for. The undecided ASK is the
  // sentence an owner relays to their developer, so naming the technical
  // thing there is its job — "needs a live region" is precisely what to
  // ask for. Everything else is read by the owner directly and gets the
  // full list. Deliberately NOT banned anywhere: "markup" and "alt text",
  // which the design project's own copy uses, and "contrast ratio", which
  // is the product's subject and taught by the report itself.
  // The professional-writing rubric's mechanical subset. Only the two
  // categories that automate without judgement are here: the stock-vocab
  // cluster and vague authorities. Negative parallelism ("not just X") is
  // deliberately NOT encoded — a sweep found three uses and all three were
  // the rubric's own allowed case, concrete distinctions ("not just the
  // white ones"), so a ban would only ever flag legitimate sentences.
  // "landscape" is likewise absent from the vocab list: in this product it
  // is a screen orientation, not a metaphor.
  it("never reaches for stock vocabulary or a vague authority", () => {
    const stock =
      /\bdelve\b|\bpivotal\b|\brobust\b|\btapestry\b|\bunderscores?\b|\bshowcases?\b|\bfosters?\b|\bintricate\b|\btestament\b|\bvibrant\b|\bseamless\b|\bleverages?\b|\bempowers?\b|\bunlocks?\b|\bgateway\b|\btransforms?\b|\belevates?\b|\bjourney\b|\bgame.chang/i;
    const authority =
      /\bexperts? (say|note|argue|agree)|\bobservers note\b|\bscholars\b|\bstudies (show|suggest)\b|\bmany believe\b/i;
    for (const [id, text] of allCopy()) {
      expect(text, `${id} reaches for stock vocabulary`).not.toMatch(stock);
      expect(text, `${id} cites a vague authority`).not.toMatch(authority);
    }
  });

  // The wordiness rubric's mechanical subset — hedges, bureaucratese and
  // filler, none of which has a legitimate use in this register. The
  // indirect-construction family ("reads as", "acts as") is not encoded:
  // those phrases carry real meaning often enough that a ban would flag
  // good sentences. Zero hits across the corpus when this was written.
  it("never hedges, pads or goes bureaucratic", () => {
    const wordy =
      /\bmay potentially\b|\bit may be (worth|advisable)\b|\bcould possibly\b|\bit is (important|worth) (to note|noting)\b|\bit should be noted\b|\bin order to\b|\bat this point in time\b|\bcommence\b|\butili[sz]e\b|\bfacilitate\b|\bprior to\b|\bin the event that\b|\bstakeholders?\b|\bwith regard to\b|\bbasically\b|\bessentially\b|\bneedless to say\b/i;
    for (const [id, text] of allCopy()) {
      expect(text, `${id} hedges or pads`).not.toMatch(wordy);
    }
  });

  // The framing rubric's mechanical subset. "below is" is deliberately
  // absent: the sweep's one hit was "the transcript below is read only",
  // a positional reference the pattern cannot tell from a
  // meta-announcement, so the pattern goes rather than the sentence.
  it("never frames, announces or concludes for the sake of it", () => {
    const framing =
      /\bbefore (getting started|we begin|diving in)\b|\bit is important to understand\b|\bwhen it comes to\b|\bin today'?s\b|\bas you can see\b|\blet'?s (take a look|dive|explore)\b|\bin conclusion\b|\bin summary\b|\bto summari[sz]e\b|\boverall,|\bultimately,|\bat the end of the day\b|\bcan help (you|organi[sz]ations|teams)\b/i;
    for (const [id, text] of allCopy()) {
      expect(text, `${id} frames or concludes emptily`).not.toMatch(framing);
    }
  });

  // No sentence said twice inside one string. Cross-card repetition is by
  // design — every card is read standalone, so two video checks may both
  // say what counts as captions — but a sentence repeated within a single
  // block is the copy-paste artefact the framing rubric names.
  it("never repeats a sentence inside one string", () => {
    for (const [id, text] of allCopy()) {
      const seen = new Set<string>();
      for (const sent of text.split(/(?<=[.?!])\s+/)) {
        const k = sent.trim().toLowerCase();
        if (k.split(/\s+/).length < 6) continue;
        expect(seen.has(k), `${id} repeats: "${sent.trim().slice(0, 60)}"`).toBe(false);
        seen.add(k);
      }
    }
  });

  it("never ships untranslated jargon", () => {
    for (const [id, text] of allCopy()) {
      const isAsk = id.startsWith("undecided:") && id.endsWith(".ask");
      const banned = isAsk ? JARGON_EVERYWHERE : JARGON_OWNER;
      expect(text, `${id} ships untranslated jargon`).not.toMatch(banned);
    }
  });

  // The guide asks for sentences under twenty words; this backstop allows a
  // little slack for sentences carrying literal code values, and catches the
  // thirty-word constructions that used to accrete. Splits only where a
  // sentence end is followed by a capital, digit or quote, so "e.g. a" and
  // decimal values never count as boundaries.
  /* 20, not the 24 this carried for months. The tone doc governing every
     string says "short sentences — under 20 words", and a house test that
     is more lenient than its own authority quietly licenses the drift it
     exists to prevent. Reading the doc is what turned this up. */
  it("keeps sentences readable", () => {
    for (const [id, text] of allCopy()) {
      const sentences = text.split(/(?<=[.?!])\s+(?=["'(A-Z0-9])/);
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        expect(
          words.length,
          `${id} has a ${words.length}-word sentence: "${sentence}"`
        ).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("what to do", () => {
  // The gap this closes: 56 of the rules carried a plain-language title and
  // a plain-language impact, and then handed the reader the engineer's own
  // remediation under "What to do" — which is where "add role='dialog' and
  // aria-modal='true'" reached a site owner who had just been told, on the
  // same card, that this goes to whoever builds the site for them.
  //
  // Four rules are exempt by name, not by pattern: their engine text works
  // out a target from the page being scanned ("raise it to about 1.43"), and
  // a hand-written sentence would replace a measured answer with a vaguer
  // one. Listed individually so a new rule cannot join them by accident.
  const MEASURED = new Set([
    "typo-leading-for-measure",
    "typo-line-length-long",
    "typo-line-length-short",
    "typo-font-size-small",
  ]);

  it("covers every rule that has a plain-language title", () => {
    const missing = Object.keys(PLAIN_RULE_EXPLANATIONS).filter(
      (id) => !MEASURED.has(id) && !PLAIN_RULE_FIXES[id]
    );
    expect(missing, `no plain-language fix for: ${missing.join(", ")}`).toEqual([]);
  });

  // Steps are for reading at a glance. One that runs past a line stops being
  // a step and becomes a paragraph with a dot in front of it.
  it("keeps each step to a single short instruction", () => {
    for (const [id, fix] of Object.entries(PLAIN_RULE_FIXES)) {
      if (!Array.isArray(fix)) continue;
      for (const step of fix) {
        const words = step.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        expect(words.length, `${id} has a ${words.length}-word step: "${step}"`).toBeLessThanOrEqual(
          18
        );
      }
    }
  });

  // The specific thing that prompted this: a site owner, told on the same
  // card that this goes to whoever builds the site for them, was then handed
  // the markup to type. The code is not wrong and has not been deleted — it
  // is in "The technical version" on the same card, written for the person
  // who will actually use it. What belongs here is what to ask for.
  it("speaks to the owner, not the developer", () => {
    const markup = /<[a-z]+>|\baria-[a-z]+\b|\brole\s*=|\balt\s+attribute\b/i;
    for (const [id, fix] of Object.entries(PLAIN_RULE_FIXES)) {
      for (const part of Array.isArray(fix) ? fix : [fix]) {
        expect(part, `${id} hands the reader markup: "${part}"`).not.toMatch(markup);
      }
    }
  });

  // Two or three actions is a list worth reading; seven is a project plan,
  // and the reader stops counting.
  it("never runs to more than four steps", () => {
    for (const [id, fix] of Object.entries(PLAIN_RULE_FIXES)) {
      if (Array.isArray(fix)) {
        expect(fix.length, `${id} has ${fix.length} steps`).toBeLessThanOrEqual(4);
        expect(fix.length, `${id} is a one-item list`).toBeGreaterThan(1);
      }
    }
  });
});

describe("block length", () => {
  // Sentences were already capped; whole blocks were not, and that is the gap
  // the copy grew into. Seven "why this matters" paragraphs had reached forty
  // to seventy-seven words against a median of seventeen — every sentence in
  // them legal, the paragraph as a whole unreadable at a glance.
  //
  // Forty-five words is roughly three lines at this report's measure. Past
  // that a reader scanning thirty findings stops reading and starts skipping,
  // and a paragraph nobody reads protects nobody.
  it("keeps every explanation to about three lines", () => {
    for (const [id, r] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
      for (const [field, text] of [
        ["impact", r.impact],
        ["research", r.research],
        ["found", r.found?.(3)],
      ] as const) {
        if (!text) continue;
        const words = text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        expect(
          words.length,
          `${id}.${field} runs to ${words.length} words`
        ).toBeLessThanOrEqual(45);
      }
    }
  });

  // The undecided rows are two paragraphs by design (why the machine could
  // not answer, and what checking it yourself involves), so they get their
  // own allowance rather than being squeezed into the same cap.
  it("keeps the undecided explanations to about four lines", () => {
    for (const [id, u] of Object.entries(UNDECIDED_EXPLANATIONS)) {
      for (const [field, text] of [
        ["what", u.what],
        ["ask", u.ask],
      ] as const) {
        const words = text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        expect(words.length, `undecided:${id}.${field} runs to ${words.length} words`).toBeLessThanOrEqual(
          60
        );
      }
    }
  });
});

describe("prose typed straight into components", () => {
  // The copy maps are tested exhaustively above, and everything in them is
  // short. That is not the whole report: a section intro written directly in
  // JSX belongs to no map, so no test could see it — which is how a
  // seventy-six word paragraph containing five rhetorical questions, and a
  // seventy-one word section intro, were both sitting in the shipped report
  // while every copy test passed.
  //
  // This reads the components as text rather than rendering them, because
  // this package has no render harness and adding one to check paragraph
  // length would be a large dependency for a small job. Paragraphs holding
  // child components are skipped: their text is assembled at runtime and a
  // source-level count would be measuring the wrong thing.
  function jsxParagraphs(): Array<[string, string]> {
    const out: Array<[string, string]> = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx")) {
          const src = readFileSync(full, "utf8");
          for (const m of src.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
            const body = m[1];
            // Inline formatting is fine; a nested component is not.
            if (/<(?!\/?(strong|em|b|i|code|span|br)\b)/.test(body)) continue;
            const text = body
              .replace(/\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, " value ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            out.push([entry.name, text]);
          }
        }
      }
    };
    walk(join(import.meta.dirname, "../src"));
    return out;
  }

  it("finds paragraphs to check", () => {
    // A guard on the guard: if the scan ever matches nothing — a refactor to
    // a different element, say — this test fails loudly instead of passing
    // silently while checking an empty list.
    expect(jsxParagraphs().length).toBeGreaterThan(20);
  });

  it("avoids jargon, same as the copy maps", () => {
    for (const [file, text] of jsxParagraphs()) {
      expect(text, `${file} ships untranslated jargon: "${text.slice(0, 60)}"`).not.toMatch(
        JARGON_OWNER
      );
    }
  });

  it("keeps them to about three lines, same as everything else", () => {
    for (const [file, text] of jsxParagraphs()) {
      const words = text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
      expect(
        words.length,
        `${file} has a ${words.length}-word paragraph: "${text.slice(0, 80)}..."`
      ).toBeLessThanOrEqual(45);
    }
  });
});
