/**
 * Two checks this stylesheet has repeatedly needed and no tool was doing.
 *
 * Both catch faults that are invisible from reading any single rule, which
 * is why they kept shipping. In one session they produced: a badge clipped
 * because a grid rule sat later in the file, a year chip set white on
 * yellow at 1.21:1, filter pills stretching edge to edge, a count tile
 * 64px inside a 48px cell — and a severity pill with NO FILL AT ALL,
 * because it referenced a ramp step that was never defined. That last one
 * measured 21:1 against the panel behind it, which reads as a contrast
 * pass in every checker.
 *
 *   1. var(--x) with no definition and no fallback.
 *      An undefined custom property resolves to nothing. The declaration
 *      is dropped, the element inherits, and the result usually looks
 *      deliberate.
 *
 *   2. Two rules that can match the same element, at the SAME specificity,
 *      setting the SAME property. Source order decides, silently. Rules
 *      pair up two ways, and both are checked:
 *        - the same selector written twice (a base rule and a later
 *          override, or an honest duplicate)
 *        - two different classes that land on one element, which is only
 *          knowable from the markup, so the JSX is read for className
 *          values carrying more than one a11y- class
 *
 * Run: npm run lint:css
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = path.join(root, "src/styles/global.css");
const SRC = path.join(root, "src");

/* ── a small CSS walker ────────────────────────────────────────────────
   Comments are stripped first, so a rule quoted inside one is never
   mistaken for a real one — that has bitten a grep-based check here
   before. At-rules are recursed into, and each rule records the at-rule
   context it sits in, because two rules in different @container blocks
   may or may not apply together. */
function parse(src) {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let buf = "";
  const stack = [];
  for (const ch of css) {
    if (ch === "{") { stack.push(buf.trim()); buf = ""; continue; }
    if (ch === "}") {
      const head = stack.pop();
      if (head && !head.startsWith("@")) {
        out.push({
          selector: head.replace(/\s+/g, " ").trim(),
          at: stack.filter((x) => x.startsWith("@")).join(" / "),
          decls: buf
            .split(";")
            .map((d) => d.trim())
            .filter(Boolean)
            .map((d) => d.slice(0, d.indexOf(":")).trim().toLowerCase())
            .filter(Boolean),
          body: buf,
        });
      }
      buf = "";
      continue;
    }
    buf += ch;
  }
  return out;
}

/* (id, class, element), the way the cascade counts it. :not() contributes
   its argument's specificity and pseudo-elements count as elements. */
function specificity(sel) {
  let s = sel.replace(/::?[a-z-]+(\([^)]*\))?/g, (m) =>
    /^::/.test(m) ? " E " : m.startsWith(":not") ? m.slice(5, -1) : " C ");
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes =
    (s.match(/\.[\w-]+/g) || []).length +
    (s.match(/\[[^\]]+\]/g) || []).length +
    (s.match(/\bC\b/g) || []).length;
  const els =
    (s.replace(/[.#[][^\s>+~,]*/g, " ").match(/\b[a-z][a-z0-9]*\b/g) || [])
      .filter((w) => w !== "c" && w !== "e").length +
    (s.match(/\bE\b/g) || []).length;
  return [ids, classes, els];
}
const specKey = (s) => specificity(s).join(",");

/* The classes a selector requires an element to carry, and its rightmost
   key — two rules can only collide on one element if that element
   satisfies both. */
const classesOf = (sel) => [...new Set((sel.match(/\.([\w-]+)/g) || []).map((c) => c.slice(1)))];
const lastKey = (sel) => {
  const tail = sel.split(/[\s>+~]+/).filter(Boolean).pop() || sel;
  return tail;
};

const css = fs.readFileSync(CSS, "utf8");
/* block carries the index of the rule the selector came from, so two
   selectors of one comma-separated group are never paired against each
   other — they ARE the same declaration block, not a collision. */
const rules = parse(css).flatMap((r, block) =>
  r.selector.split(",").map((s) => ({ ...r, block, selector: s.replace(/\s+/g, " ").trim() }))
).filter((r) => r.selector && r.decls.length);

const problems = [];

/* ── 1. undefined custom properties ─────────────────────────────────── */
const defined = new Set([...css.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)].map((m) => m[2]));
const used = new Map();
for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
  const [, name, fallback] = m;
  if (!used.has(name)) used.set(name, { bare: 0, withFallback: 0 });
  used.get(name)[fallback ? "withFallback" : "bare"] += 1;
}
for (const [name, counts] of used) {
  if (defined.has(name)) continue;
  if (counts.bare === 0) continue; // a fallback is a deliberate default
  problems.push({
    kind: "undefined-var",
    detail: `${name} is used ${counts.bare}× with no definition and no fallback`,
    why: "resolves to nothing — the declaration is dropped and the element inherits",
  });
}

/* ── 2. equal-specificity collisions ────────────────────────────────── */

/* Which classes actually land on one element together. Only the markup
   knows, so read it. */
const coOccur = new Set();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.tsx$/.test(e.name)) continue;
    const src = fs.readFileSync(p, "utf8");
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
      const names = [...new Set((m[1] || m[2] || m[3] || "").match(/a11y-[\w-]+/g) || [])];
      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++)
          coOccur.add([names[i], names[j]].sort().join("|"));
    }
  }
})(SRC);

/* Two rules can land on one element when they key off the same class, or
   off two classes the markup puts together. A shared bare ELEMENT tail
   (td, th, strong) is not enough on its own — .a11y-findings-table td and
   .a11y-pro-table td both end in td and can never meet. */
const canMatchSameElement = (a, b) => {
  const ka = lastKey(a.selector), kb = lastKey(b.selector);
  const ca = classesOf(a.selector), cb = classesOf(b.selector);
  if (ka === kb && ka.startsWith(".")) return true;
  if (ka === kb) {
    /* Same element tail: only if neither carries a class the other lacks,
       i.e. one context contains the other. */
    return ca.every((c) => cb.includes(c)) || cb.every((c) => ca.includes(c));
  }
  const ea = ca[ca.length - 1], eb = cb[cb.length - 1];
  if (!ea || !eb || ea === eb) return false;
  return coOccur.has([ea, eb].sort().join("|"));
};

for (let i = 0; i < rules.length; i++) {
  for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if (a.block === b.block) continue;
    if (specKey(a.selector) !== specKey(b.selector)) continue;
    /* Different at-rule contexts are the deliberate pattern — a base rule
       and its responsive or print override. Those are how this file is
       meant to work, and flagging them buried the real findings 30 to 1.
       A collision only matters when both rules apply at the same time. */
    if (a.at !== b.at) continue;
    if (!canMatchSameElement(a, b)) continue;
    /* A modifier overriding its own base is the point of a modifier —
       .a11y-sum-pill then .a11y-sum-pill-band, placed after on purpose.
       Flagging those buries the collisions nobody intended. One class
       name being a prefix of the other is what marks the pair. */
    const ea2 = classesOf(a.selector).pop() || "", eb2 = classesOf(b.selector).pop() || "";
    if (ea2 && eb2 && ea2 !== eb2 &&
        (eb2.startsWith(ea2 + "-") || ea2.startsWith(eb2 + "-"))) continue;
    const shared = a.decls.filter((d) => b.decls.includes(d));
    if (!shared.length) continue;
    problems.push({
      kind: "specificity-tie",
      detail: `${a.selector}${a.at ? `  [${a.at}]` : ""}\n      vs  ${b.selector}${b.at ? `  [${b.at}]` : ""}`,
      why: `both (${specKey(a.selector)}), both set ${shared.join(", ")} — the later one wins on source order alone`,
    });
  }
}

/* ── report ─────────────────────────────────────────────────────────── */
const byKind = (k) => problems.filter((p) => p.kind === k);
for (const kind of ["undefined-var", "specificity-tie"]) {
  const list = byKind(kind);
  console.log(`\n${kind}: ${list.length}`);
  for (const p of list) console.log(`  - ${p.detail}\n      ${p.why}`);
}
console.log(
  `\nchecked ${rules.length} rules, ${used.size} custom properties, ` +
    `${coOccur.size} class pairs from the markup`
);
if (problems.length) {
  console.log(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log("\nclean.");
