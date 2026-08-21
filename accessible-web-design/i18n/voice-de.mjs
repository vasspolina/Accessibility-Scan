#!/usr/bin/env node
/**
 * The German voice rules, applied to the site catalogue.
 *
 * The widget has had `voice.de.test.ts` since its German shipped. The site's
 * German had nothing, so every rule was re-argued by hand in review. These
 * are the same rules, plus the two term collisions that a human review found
 * by counting — which is exactly the kind of finding that should never need
 * a human twice.
 *
 * What is here is only what can be decided by machine. Whether a recreated
 * metaphor lands in German is not in this file and never will be; see
 * de-draft-review.md for the questions that need a native ear.
 *
 *   node i18n/voice-de.mjs                  check de.draft.json and de.json
 *   node i18n/voice-de.mjs messages/de.json check one catalogue
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EN = JSON.parse(fs.readFileSync(path.join(HERE, "messages/en.json"), "utf8"));

/* Keys where a term that is otherwise reserved is legitimately something
   else. An allowlist rather than a blanket ban, because both words are
   ordinary German — the fault is using them for two concepts, not using
   them at all. A new entry here should be a decision someone made. */
const SEITE_OK = new Set([
  // "Nennen Sie uns die Seite" — one page of the site, which is what the
  // reader is being asked to name. The site as a whole is always Website.
  "statement.feedbackIntro",
]);
const PRUEFUNG_OK = new Set([
  // The audit this studio sells. Anything else an authority does is not a
  // Prüfung here, or the word names two things two screens apart.
  "eaa.auditLink",
  "apply.notSureLink",
]);

const BANNED = [
  ["fear-based selling", /\b(Abmahnung|Abmahnungen|Bußgeld|Bußgelder|Strafzahlung|Strafen|drohen|droht)\b/i],
  ["overpromise", /\b(rechtssicher|rechtssichere[rn]?|vollständig barrierefrei|100\s*%\s*barrierefrei|garantiert)\b/i],
  ["consultancy filler", /\b(ganzheitlich\w*|Mehrwert|zukunftssicher\w*|maßgeschneidert\w*|Synergie\w*|Lösungsansatz)\b/i],
  ["Amtsdeutsch", /\b(vorbehaltlich|diesbezüglich|nachfolgend aufgeführt\w*|in Kenntnis setzen|Inanspruchnahme)\b/i],
  ["Denglisch", /\b(Website-Owner|Compliance|Deadline|Feature[sn]?|Update[sn]?|Learnings|Benefit[sn]?)\b/i],
];

const rules = [
  ["says Sie, never du", (v) => (/\b(du|dich|dir|dein|deine[rmns]?)\b/i.test(v) ? "uses du-form" : null)],
  ["no exclamation points", (v) => (v.includes("!") ? "exclamation point" : null)],
  [
    "spaced en dash, not em dash",
    (v) => (v.includes("—") ? "em dash — should be a spaced en dash –" : null),
  ],
  [
    "dates in long form",
    (v) => (/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/.test(v) ? "numeric date" : null),
  ],
  [
    "no imperial measurement",
    (v) => (/\b\d+\s*(ft|foot|feet|inch|inches|lbs?|miles?)\b|\d+'\d*"/.test(v) ? "imperial unit" : null),
  ],
  [
    "sentences under twenty words",
    (v) => {
      // Split on . ! ? : — the same interpretation the widget's suite uses.
      // A colon ends a clause here because the catalogue uses it to introduce
      // lists, and counting the list as one sentence would hide real length.
      const long = v
        .split(/[.!?:]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ s, n: s.split(/\s+/).length }))
        .filter((x) => x.n > 20);
      return long.length ? `${long[0].n}-word sentence: "${long[0].s.slice(0, 60)}…"` : null;
    },
  ],
];

function check(file) {
  const full = path.join(HERE, file);
  if (!fs.existsSync(full)) return null;
  const cat = JSON.parse(fs.readFileSync(full, "utf8"));
  const entries = Object.entries(cat).filter(([, v]) => typeof v === "string" && v.trim());
  const problems = [];

  for (const [key, value] of entries) {
    for (const [name, fn] of rules) {
      const why = fn(value);
      if (why) problems.push({ key, rule: name, why });
    }
    for (const [name, re] of BANNED) {
      const m = value.match(re);
      if (m) problems.push({ key, rule: name, why: `"${m[0]}"` });
    }
    // One term per concept. Both words are fine German; using them for a
    // second concept is what breaks the rule, so both are allowlisted by key.
    if (/\bSeite[n]?\b/.test(value) && !SEITE_OK.has(key)) {
      problems.push({ key, rule: "one term per concept", why: '"Seite" — the site is always "Website"' });
    }
    if (/\bPrüfung\w*\b/.test(value) && !PRUEFUNG_OK.has(key)) {
      problems.push({ key, rule: "one term per concept", why: '"Prüfung" is reserved for the audit this studio sells' });
    }
    // A placeholder dropped in translation silently loses a number the copy
    // depends on — the EUR threshold, or the metric height.
    for (const ph of EN[key]?.match(/\{(\w+)\}/g) ?? []) {
      if (!value.includes(ph)) problems.push({ key, rule: "placeholder preserved", why: `${ph} missing` });
    }
  }
  return { file, examined: entries.length, total: Object.keys(cat).length, problems };
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["messages/de.draft.json", "messages/de.json"];

let failed = 0;
for (const t of targets) {
  const r = check(t);
  if (!r) { console.log(`${t}: not present, skipped`); continue; }
  // An empty catalogue must never read as a clean one: de.json is every key
  // present and blank until a reviewer fills it, and "0 problems" there
  // means nothing was looked at.
  if (!r.examined) {
    console.log(`${t}: ${r.total} keys, all empty — nothing to check yet`);
    continue;
  }
  console.log(`\n${t}: ${r.examined} of ${r.total} strings checked`);
  if (!r.problems.length) {
    // Say what a pass is worth. A catalogue that is one string long passing
    // every rule is not evidence about the other 132.
    console.log(r.examined < r.total / 2
      ? `  clean, but only ${r.examined} string(s) exist — this is not a pass for the catalogue`
      : "  clean");
    continue;
  }
  for (const p of r.problems) console.log(`  ${p.key}\n    ${p.rule}: ${p.why}`);
  console.log(`  ${r.problems.length} problem(s)`);
  failed += r.problems.length;
}

// The draft is under review and expected to carry findings, so this reports
// without failing the build. Once de.json is filled it should be wired into
// `npm run check` and allowed to fail.
console.log(failed ? `\n${failed} problem(s) total.` : "\nNo problems.");
process.exit(0);
