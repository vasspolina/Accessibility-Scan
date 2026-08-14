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
 *
 * On the remaining specificity ties (41 at this writing): an automated
 * cross-group surgery was attempted twice on 14 Aug 2026 — split the comma
 * groups a tied selector shares, then delete earlier-occurrence shadowed
 * declarations — and rejected twice by its own gate. Verdict for whoever
 * tries next: (1) the computed-style snapshot found a deterministic 2-diff
 * on .a11y-shell-nav-toggle at 600/414 that four hypotheses failed to
 * explain, and an unexplained diff in a "provable" transform means the
 * implementation diverges from the proof; (2) even at zero diffs the
 * output mutilates this file — comments triplicated into split copies,
 * prose orphaned from deleted declarations — and the comments here are
 * load-bearing; (3) deleting emptied rules by regex risks mis-splices
 * that CSS Nesting now parses SILENTLY instead of erroring, which matches
 * the failure signature exactly. The 41 want hands, not a codemod: each
 * entry prints its two values, and the snapshot harness
 * (style-snapshot pattern: computed styles only, never geometry, clean
 * server start per side) is the gate any hand-batch must pass.
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
  /* Attribute variants are alternatives, not companions: [data-band="good"]
     and [data-band="failing"] name states one element holds one at a time,
     the same way the severity classes do. Same attribute, different value,
     anywhere in the pair: disjoint. */
  const attrsOf = (sel) => {
    const m = {};
    for (const a2 of sel.match(/\[([a-z-]+)="([^"]*)"\]/g) ?? []) {
      const [, name, val] = a2.match(/\[([a-z-]+)="([^"]*)"\]/);
      m[name] = val;
    }
    return m;
  };
  const aa2 = attrsOf(a.selector), ab2 = attrsOf(b.selector);
  for (const name of Object.keys(aa2))
    if (name in ab2 && aa2[name] !== ab2[name]) return false;
  if (ka === kb && ka.startsWith(".")) {
    /* Same class tail is not enough on its own: the ancestor contexts
       have to be compatible too. .a11y-severity-critical .a11y-method-badge
       and .a11y-severity-moderate .a11y-method-badge share a tail and can
       never share an element — a row carries one severity — and
       .a11y-stmt .a11y-conf-caveat never sits inside .a11y-w22-panel.
       When both sides carry ancestor classes and the sets share nothing,
       the pair is treated as disjoint. This errs toward silence for that
       one shape: nested sections could in principle make such a pair
       real, but every flagged instance of it in this file was a variant
       or a sibling section, and nine phantom conflicts buried the real
       list. Same-tail pairs with NO differing ancestors still flag. */
    const anc = (sel) => classesOf(sel).slice(0, -1);
    const aa = anc(a.selector), ab = anc(b.selector);
    const onlyA = aa.filter((c) => !ab.includes(c));
    const onlyB = ab.filter((c) => !aa.includes(c));
    if (onlyA.length && onlyB.length) return false;
    return true;
  }
  if (ka === kb) {
    /* Same element tail: only if neither carries a class the other lacks,
       i.e. one context contains the other. */
    return ca.every((c) => cb.includes(c)) || cb.every((c) => ca.includes(c));
  }
  const ea = ca[ca.length - 1], eb = cb[cb.length - 1];
  if (!ea || !eb || ea === eb) return false;
  if (!coOccur.has([ea, eb].sort().join("|"))) return false;
  /* Two refinements the newscan compound and the history button taught:
     every class in a selector's FINAL compound must co-occur with the
     other side's tail (markup that never puts .a11y-newscan-title on a
     .a11y-hist-title element cannot produce the collision) — and
     different-tail pairs get the same disjoint-ancestor test the
     same-tail path has, so .a11y-conf-panel's button never collides
     with .a11y-hist's. */
  const tailClasses = (sel) => {
    const tail = sel.split(/[\s>+~]+/).filter(Boolean).pop() || "";
    return (tail.match(/\.([\w-]+)/g) ?? []).map((c) => c.slice(1));
  };
  for (const t of tailClasses(a.selector))
    if (t !== eb && !coOccur.has([t, eb].sort().join("|"))) return false;
  for (const t of tailClasses(b.selector))
    if (t !== ea && !coOccur.has([t, ea].sort().join("|"))) return false;
  const anc2 = (sel) => classesOf(sel).slice(0, -1);
  const xa = anc2(a.selector).filter((c) => !anc2(b.selector).includes(c));
  const xb = anc2(b.selector).filter((c) => !anc2(a.selector).includes(c));
  if (xa.length && xb.length) return false;
  return true;
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
    /* A tie is only a hazard when the values DIVERGE — then source order
       is silently choosing one meaning over another. When both rules set
       the property to the identical value, order cannot change what
       renders; the repeat may still be worth merging one day, but it is
       housekeeping, not a fault, and burying 100+ of those in the same
       count as the real conflicts is how the real ones went untriaged
       for a week. (Deleting the "identical" ones is NOT safe — one may
       be re-asserting after an at-rule override — which is why they are
       counted apart rather than removed.) */
    const valueOf = (r, prop) => {
      const m = [...r.body.matchAll(new RegExp(String.raw`(?:^|;)\s*${prop}\s*:\s*([^;]+)`, "g"))];
      return m.length ? m[m.length - 1][1].trim() : "";
    };
    const divergent = shared.filter((d) => valueOf(a, d) !== valueOf(b, d));
    if (divergent.length) {
      problems.push({
        kind: "specificity-tie",
        detail: `${a.selector}${a.at ? `  [${a.at}]` : ""}\n      vs  ${b.selector}${b.at ? `  [${b.at}]` : ""}`,
        why: `both (${specKey(a.selector)}) — ${divergent.map((d) => `${d}: "${valueOf(a, d)}" vs "${valueOf(b, d)}"`).join("; ")} — the later wins on source order alone`,
      });
    } else {
      problems.push({
        kind: "specificity-tie-benign",
        detail: `${a.selector}  =  ${b.selector}`,
        why: `same value for ${shared.join(", ")}`,
      });
    }
  }
}

/* ── 3. welded inline siblings ───────────────────────────────────────
   Two inline elements written on separate lines in JSX render with NO
   space between them: JSX strips whitespace that contains a newline. So
   the markup looks spaced and the page reads "1.1.1 ADo images have a
   description". Four separate components shipped that fault in one day —
   also "WCAG 2.1 AAThe EU's technical standard", "Deuteranopia~6% of
   men", and "…is it still visible?2.4.11 · Level AA".

   It always reads as a copywriting bug and it never is. The separation
   has to come from CSS, so a pair is flagged when NEITHER side declares
   anything that would provide it. */
const SEPARATES = /^(display|margin|padding|gap|float|position)/;
const givesSeparation = (cls) => {
  for (const r of rules) {
    if (!r.selector.includes("." + cls)) continue;
    for (const d of r.decls) {
      if (!SEPARATES.test(d)) continue;
      /* display only counts when it takes the box out of the inline flow. */
      if (d === "display") {
        const v = (r.body.match(/display:\s*([a-z-]+)/) || [])[1] || "";
        if (/^(block|flex|grid|inline-block|inline-flex|table|list-item|none)$/.test(v)) return true;
        continue;
      }
      return true;
    }
  }
  return false;
};

/* Does a rule on their shared-prefix parent lay them out with a gap? */
const parentGaps = (a, b) => {
  const parts = a.split("-");
  for (let i = parts.length - 1; i >= 2; i--) {
    const prefix = parts.slice(0, i).join("-");
    if (!b.startsWith(prefix)) continue;
    for (const r of rules) {
      if (!r.selector.includes("." + prefix)) continue;
      const body = r.body;
      const disp = (body.match(/display:\s*([a-z-]+)/) || [])[1] || "";
      if (!/flex|grid/.test(disp)) continue;
      if (/(^|[;\s])(gap|column-gap)\s*:/.test(body)) return true;
      if (/justify-content:\s*space-between/.test(body)) return true;
    }
  }
  return false;
};

/* An element immediately followed by another, whitespace only between. */
const INLINE_TAG = /^(span|em|code|strong|b|i|small|abbr|a)$/;
(function walkJsx(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkJsx(p); continue; }
    if (!/\.tsx$/.test(e.name)) continue;
    const src = fs.readFileSync(p, "utf8");
    const re = /<\/(\w+)>\s*\n\s*<(\w+)\s[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
    for (const m of src.matchAll(re)) {
      const [, closeTag, openTag, q, tpl] = m;
      if (!INLINE_TAG.test(closeTag) || !INLINE_TAG.test(openTag)) continue;
      const after = ((q || tpl || "").match(/a11y-[\w-]+/) || [])[0];
      /* The class on the element that just closed, read backwards. */
      const before = [...src.slice(0, m.index).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
        .map((x) => ((x[1] || x[2] || "").match(/a11y-[\w-]+/) || [])[0]).filter(Boolean).pop();
      if (!after || !before) continue;
      if (givesSeparation(before) || givesSeparation(after)) continue;
      /* Or the parent lays them out. The parent's class is not in this
         match, but this file names children after them —
         a11y-count-pill-n inside a11y-count-pill — so the longest shared
         prefix is the parent, and a flex or grid rule on it with a gap
         separates the pair without either child saying anything. */
      if (parentGaps(before, after)) continue;
      problems.push({
        kind: "welded-siblings",
        detail: `${path.basename(p)}: <${closeTag} class="${before}"> immediately followed by <${openTag} class="${after}">`,
        why: "JSX drops the newline between them, so they render with no space and neither class declares any separation",
      });
    }
  }
})(SRC);

/* ── report ─────────────────────────────────────────────────────────── */
const byKind = (k) => problems.filter((p) => p.kind === k);
for (const kind of ["undefined-var", "welded-siblings", "specificity-tie"]) {
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
