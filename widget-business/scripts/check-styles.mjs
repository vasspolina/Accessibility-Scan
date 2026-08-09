#!/usr/bin/env node
/**
 * Two checks the design system's own _adherence.oxlintrc.json made the case
 * for, aimed at the failure this repo actually keeps having.
 *
 * Eight styling passes this session each found the same shape: a rule on the
 * container and none on its contents. And four selectors shipped or nearly
 * shipped matching nothing at all — [data-band="middling"], .a11y-notification,
 * .a11y-filter-row, .a11y-fix-none. A selector that matches nothing does not
 * error. It just quietly does nothing, and the page looks plausible.
 *
 *   dead      a selector in the stylesheet that no markup ever produces
 *   unstyled  a class in the markup that no rule ever matches
 *
 * Neither is automatically a fault — see ALLOW below — but every one should be
 * a decision rather than a surprise.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;
const CSS = join(SRC, "styles/global.css");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".tsx", ".ts"].includes(extname(p))) out.push(p);
  }
  return out;
}

const css = readFileSync(CSS, "utf8");

/* Class names the stylesheet targets. Only a11y-* — the design system's own
   as-* names are documentation in comments, not selectors here. */
const styled = new Set(
  [...css.matchAll(/\.(a11y-[a-z0-9-]+)/g)].map((m) => m[1])
);

/* Class names the markup produces. Template literals are the interesting case:
   `a11y-fix-${key}` yields a prefix, and the check compares prefixes so a
   whole family counts as used when any rule covers it. */
const used = new Set();
const dynamicPrefixes = new Set();
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/(a11y-[a-z0-9-]+)\$\{/g)) dynamicPrefixes.add(m[1]);
  for (const m of src.matchAll(/(a11y-[a-z0-9-]+)/g)) used.add(m[1]);
}

/* Not faults:
   - sr-only and friends are utilities applied by name, not styled per use
   - selectors JS depends on (documented in docs/ui-inventory.md)
   - severity/tone families are completed by their modifier rules */
const ALLOW = [
  /^a11y-sr-only$/,
  /^a11y-widget-(biz|inner)$/,
  /^a11y-widget-business-root$/,
  /^a11y-dialog-root$/,
  /^a11y-print-cards$/,
];
const allowed = (c) => ALLOW.some((re) => re.test(c));
const coveredByPrefix = (c) => [...dynamicPrefixes].some((p) => c.startsWith(p));

const dead = [...styled]
  .filter((c) => !used.has(c) && !allowed(c) && !coveredByPrefix(c))
  .sort();
const unstyled = [...used]
  .filter((c) => !styled.has(c) && !allowed(c))
  .sort();

const report = (label, list) => {
  console.log(`\n${label}: ${list.length}`);
  for (const c of list) console.log(`  ${c}`);
};

report("DEAD — in the stylesheet, never in the markup", dead);
report("UNSTYLED — in the markup, never in the stylesheet", unstyled);

console.log(
  `\n${styled.size} classes styled, ${used.size} used in markup.\n` +
    `Neither list has to be empty. Every entry should be a decision.\n`
);

/* Exit 0 always: this reports, it does not gate. Making it fail the build
   needs the lists triaged first, or it fails on day one and gets disabled. */
