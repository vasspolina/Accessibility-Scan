/**
 * Rewrites src/styles/global.css so that the cascade is source order alone.
 *
 * What it does, in order:
 *   1. Splits every rule into one rule per selector branch and works out each
 *      branch's specificity as written.
 *   2. Sorts the rules by (specificity, source position): the order in which
 *      the browser already lets one rule win over another.
 *   3. Removes specificity padding (a class or [class] repeated in one
 *      compound, :not(.a11y-x1)…:not(.a11y-xN) chains on class names no
 *      markup carries) and wraps each selector in :where(), so every rule has
 *      specificity zero and the later rule wins.
 *   4. Deletes declarations a later rule with the same selector overrides.
 *   5. Groups the rules by component. A rule is moved past another only when
 *      the two cannot disagree: they set unrelated properties, they style
 *      different pseudo-elements, or their subjects carry classes the markup
 *      never puts on one element (read from the TSX; a class used anywhere
 *      but a literal className on a DOM element is treated as shared).
 *   6. Merges neighbouring rules with the same selector, and neighbouring
 *      selectors with the same declarations.
 *
 * Run:  node scripts/organise-css.mjs            rewrite global.css in place
 *       node scripts/organise-css.mjs --out f    write the result to f
 *       node scripts/organise-css.mjs --check    exit 1 if a run would change it
 *
 * The script is idempotent: a rule appended in any style (padded or not) is
 * sorted into its component on the next run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = path.join(root, "src/styles/global.css");
const SRC = path.join(root, "src");
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : CSS;
const CHECK = args.includes("--check");

/* ───────────────────────── selector parsing ───────────────────────── */

/** Split at top-level occurrences of `ch` (outside (), [] and strings). */
function splitTop(s, ch) {
  const out = []; let depth = 0, q = null, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === ch && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map((x) => x.trim());
}

/** Tokenise one complex selector into compounds and combinators. */
function parseComplex(sel) {
  const parts = []; // {type:'compound', simples:[...]} | {type:'comb', value}
  let i = 0; const n = sel.length;
  let cur = null;
  const pushComb = (v) => {
    cur = null;
    const last = parts[parts.length - 1];
    if (last && last.type === "comb") { if (v !== " ") last.value = v; }
    else parts.push({ type: "comb", value: v });
  };
  const simple = (text, kind, name, arg) => {
    if (!cur) { cur = { type: "compound", simples: [] }; parts.push(cur); }
    cur.simples.push({ text, kind, name, arg });
  };
  const readIdent = () => { const m = /^(?:[\w-]|\\.|[^\x00-\x7f])+/.exec(sel.slice(i)); if (!m) throw new Error("ident expected at " + i + " in " + sel); i += m[0].length; return m[0]; };
  const readParen = () => { // at "(": returns inner text, leaves i after ")"
    let depth = 0, q = null; const start = i + 1;
    for (; i < n; i++) {
      const c = sel[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") { depth--; if (depth === 0) { i++; return sel.slice(start, i - 1); } }
    }
    throw new Error("unbalanced ( in " + sel);
  };
  while (i < n) {
    const c = sel[i];
    if (/\s/.test(c)) { while (i < n && /\s/.test(sel[i])) i++; if (parts.length && i < n && !/[>+~]/.test(sel[i])) pushComb(" "); continue; }
    if (c === ">" || c === "+" || c === "~") { i++; pushComb(c); while (i < n && /\s/.test(sel[i])) i++; continue; }
    if (c === "*") { i++; simple("*", "universal"); continue; }
    if (c === ".") { i++; const id = readIdent(); simple("." + id, "class", id); continue; }
    if (c === "#") { i++; const id = readIdent(); simple("#" + id, "id", id); continue; }
    if (c === "[") { const s0 = i; let q = null; for (; i < n; i++) { const d = sel[i]; if (q) { if (d === "\\") i++; else if (d === q) q = null; } else if (d === '"' || d === "'") q = d; else if (d === "]") { i++; break; } } simple(sel.slice(s0, i), "attr"); continue; }
    if (c === ":") {
      const pe = sel[i + 1] === ":"; i += pe ? 2 : 1;
      const name = readIdent().toLowerCase(); let arg = null;
      if (sel[i] === "(") arg = readParen();
      const legacyPe = !pe && ["before", "after", "first-line", "first-letter"].includes(name);
      simple((pe ? "::" : ":") + name + (arg !== null ? "(" + arg + ")" : ""), pe || legacyPe ? "pe" : "pc", name, arg);
      continue;
    }
    if (c === "&") throw new Error("nesting is not supported: " + sel);
    const id = readIdent(); simple(id, "type", id.toLowerCase());
  }
  if (parts.length && parts[parts.length - 1].type === "comb") parts.pop();
  if (parts.length && parts[0].type === "comb" && parts[0].value === " ") parts.shift();
  return parts;
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const maxSpec = (list) => list.reduce((m, s) => (cmp(s, m) > 0 ? s : m), [0, 0, 0]);

function specificity(sel) {
  let s = [0, 0, 0];
  for (const p of parseComplex(sel)) {
    if (p.type !== "compound") continue;
    for (const x of p.simples) {
      if (x.kind === "id") s = add(s, [1, 0, 0]);
      else if (x.kind === "class" || x.kind === "attr") s = add(s, [0, 1, 0]);
      else if (x.kind === "type" || x.kind === "pe") s = add(s, [0, 0, 1]);
      else if (x.kind === "pc") {
        if (x.name === "where") continue;
        if (["is", "not", "has", "matches", "-webkit-any"].includes(x.name)) { s = add(s, maxSpec(splitTop(x.arg, ",").map(specificity))); continue; }
        s = add(s, [0, 1, 0]);
        if ((x.name === "nth-child" || x.name === "nth-last-child") && / of /.test(x.arg || "")) s = add(s, maxSpec(splitTop(x.arg.split(/ of /)[1], ",").map(specificity)));
      }
    }
  }
  return s;
}

/* Classes that exist only to add specificity: a11y- plus one letter and a
   number. No markup carries one (checked against the sources below). */
const PAD = /^a11y-[a-z]\d+$/;
let sourceText = "";
for (const f of fs.readdirSync(SRC, { recursive: true })) {
  if (/\.(tsx?|js|html)$/.test(f)) sourceText += fs.readFileSync(path.join(SRC, f), "utf8") + "\n";
}
const realClasses = new Set(sourceText.match(/a11y-[a-z0-9]+(?:-[a-z0-9]+)*/g) || []);
const isPad = (cls) => PAD.test(cls) && !realClasses.has(cls);

/* A rule that needs a class no source file names, whole or as the fixed
   start of a built name (`a11y-sev-${…}`), can never match. */
const dynamicPrefixes = [...new Set([...sourceText.matchAll(/(a11y-[a-z0-9-]*-)(?:\$\{|["'`]\s*\+)/g)].map((m) => m[1]))];
const classExists = (c) => realClasses.has(c) || dynamicPrefixes.some((p) => c.startsWith(p));
function neverMatches(sel) {
  for (const p of parseComplex(sel)) {
    if (p.type !== "compound") continue;
    for (const x of p.simples) {
      if (x.kind === "class" && !classExists(x.name)) return x.name;
      if (x.kind === "pc" && (x.name === "is" || x.name === "where")) { const dead = splitTop(x.arg, ",").map(neverMatches); if (dead.every(Boolean)) return dead[0]; }
    }
  }
  return null;
}

function serialise(parts) {
  return parts.map((p) => p.type === "comb" ? (p.value === " " ? " " : ` ${p.value} `) : p.simples.map((s) => s.text).join("")).join("").trim();
}

/** Remove padding, recursively; unwrap an earlier run's :where() wrapper. */
function normaliseComplex(sel) {
  const parts = parseComplex(sel);
  for (const p of parts) {
    if (p.type !== "compound") continue;
    const seen = new Set(); const out = [];
    for (const x of p.simples) {
      if (x.kind === "pc" && x.name === "not" && x.arg && x.arg.trim().startsWith(".") && isPad(x.arg.trim().slice(1))) continue;
      if (x.kind === "pc" && x.arg !== null && ["is", "not", "has", "where"].includes(x.name)) {
        const inner = splitTop(x.arg, ",").map((a) => {
          // :has() takes a relative selector; keep a leading combinator.
          const m = /^\s*([>+~])\s*(.*)$/s.exec(a);
          return m ? `${m[1]} ${normaliseComplex(m[2])}` : normaliseComplex(a);
        });
        let alts = [...new Set(inner)];
        if (x.name === "is" || x.name === "where") { const alive = alts.filter((alt) => !neverMatches(alt)); if (alive.length) alts = alive; }
        if (x.name === "not") { alts = alts.filter((alt) => !neverMatches(alt)); if (!alts.length) continue; }
        x.arg = alts.join(", ");
        x.text = `:${x.name}(${x.arg})`;
      }
      if (seen.has(x.text)) continue;
      seen.add(x.text); out.push(x);
    }
    const hasClass = out.some((x) => x.kind === "class") ||
      out.some((x) => x.kind === "pc" && x.name === "is" && splitTop(x.arg, ",").every((a) => { const ps = parseComplex(a); const last = ps[ps.length - 1]; return last && last.simples.some((y) => y.kind === "class"); }));
    p.simples = hasClass ? out.filter((x) => x.text !== "[class]") : out;
    if (!p.simples.length) p.simples = [{ text: "*", kind: "universal" }];
  }
  return serialise(parts);
}

/** A branch → { body, pe }: the selector without its pseudo-element, and the
    pseudo-element suffix (which cannot go inside :where()). */
function splitPseudoElement(sel) {
  const parts = parseComplex(sel);
  const last = parts[parts.length - 1];
  const at = last.simples.findIndex((x) => x.kind === "pe");
  if (at === -1) return { body: serialise(parts), pe: "" };
  const pe = last.simples.slice(at).map((x) => x.text).join("");
  last.simples = last.simples.slice(0, at);
  if (!last.simples.length) last.simples = [{ text: "*", kind: "universal" }];
  return { body: serialise(parts), pe };
}

/** Undo an earlier run: ":where(A)::pe" → "A::pe"; ":where(A, B)" → A, B. */
function unwrap(branch) {
  const parts = parseComplex(branch);
  if (parts.length === 1 && parts[0].simples[0]?.kind === "pc" && parts[0].simples[0].name === "where" && parts[0].simples.slice(1).every((x) => x.kind === "pe")) {
    const pe = parts[0].simples.slice(1).map((x) => x.text).join("");
    return { wrapped: true, list: splitTop(parts[0].simples[0].arg, ",").map((a) => a + pe) };
  }
  return { wrapped: false, list: [branch] };
}

/* ───────────────────────── properties ───────────────────────── */

const SIDES = ["top", "right", "bottom", "left"];
const COVERS = {
  margin: SIDES.map((s) => `margin-${s}`), padding: SIDES.map((s) => `padding-${s}`), inset: SIDES,
  "margin-block": ["margin-block-start", "margin-block-end"], "margin-inline": ["margin-inline-start", "margin-inline-end"],
  "padding-block": ["padding-block-start", "padding-block-end"], "padding-inline": ["padding-inline-start", "padding-inline-end"],
  border: [...SIDES.flatMap((s) => [`border-${s}`, `border-${s}-width`, `border-${s}-style`, `border-${s}-color`]), "border-width", "border-style", "border-color"],
  ...Object.fromEntries(SIDES.map((s) => [`border-${s}`, [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]])),
  "border-width": SIDES.map((s) => `border-${s}-width`), "border-style": SIDES.map((s) => `border-${s}-style`), "border-color": SIDES.map((s) => `border-${s}-color`),
  "border-radius": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
  background: ["background-color", "background-image", "background-position", "background-size", "background-repeat", "background-origin", "background-clip", "background-attachment"],
  font: ["font-style", "font-weight", "font-size", "line-height", "font-family", "font-stretch", "font-variant"],
  flex: ["flex-grow", "flex-shrink", "flex-basis"], "flex-flow": ["flex-direction", "flex-wrap"],
  gap: ["row-gap", "column-gap"], "grid-row": ["grid-row-start", "grid-row-end"], "grid-column": ["grid-column-start", "grid-column-end"],
  "grid-area": ["grid-row-start", "grid-row-end", "grid-column-start", "grid-column-end", "grid-row", "grid-column"],
  "grid-template": ["grid-template-rows", "grid-template-columns", "grid-template-areas"],
  "place-items": ["align-items", "justify-items"], "place-content": ["align-content", "justify-content"], "place-self": ["align-self", "justify-self"],
  outline: ["outline-color", "outline-style", "outline-width"], overflow: ["overflow-x", "overflow-y"],
  "text-decoration": ["text-decoration-line", "text-decoration-style", "text-decoration-color"],
  "list-style": ["list-style-type", "list-style-position", "list-style-image"],
  transition: ["transition-property", "transition-duration", "transition-timing-function", "transition-delay"],
  animation: ["animation-name", "animation-duration", "animation-timing-function", "animation-delay", "animation-iteration-count", "animation-direction", "animation-fill-mode", "animation-play-state"],
  columns: ["column-width", "column-count"], "column-rule": ["column-rule-width", "column-rule-style", "column-rule-color"],
  container: ["container-name", "container-type"],
};
/* A value an older browser drops at parse time: the declaration under it may
   be that browser's fallback, so it never counts as overriding one. */
const RISKY = /\d(?:lh|rlh|dvh|svh|lvh|dvw|cqw|cqi|cqh|cqb)\b|color-mix\(|light-dark\(|anchor\(|\/\s*""|^trim-|text-box/;

/* Properties that can disagree with each other: a coarse family name. */
const FAMILY_PREFIXES = ["margin", "padding", "border", "background", "font", "flex", "grid", "outline", "overflow", "list-style", "transition", "animation", "column", "container", "mask", "inset", "scroll-margin", "scroll-padding", "text-decoration", "text-emphasis", "text-box", "text-wrap", "overscroll", "place", "align", "justify"];
function family(prop) {
  if (prop.startsWith("--")) return prop;
  let p = prop.replace(/^-(webkit|moz|ms|o)-/, "");
  if (["top", "right", "bottom", "left"].includes(p) || p.startsWith("inset")) return "inset";
  if (/^(min-|max-)?(width|inline-size)$/.test(p)) return (p.match(/^(min-|max-)/)?.[0] ?? "") + "width";
  if (/^(min-|max-)?(height|block-size)$/.test(p)) return (p.match(/^(min-|max-)/)?.[0] ?? "") + "height";
  if (p === "line-height") return "font";
  if (p === "gap" || p === "row-gap" || p === "column-gap") return "grid";
  if (p === "columns") return "column";
  if (p === "white-space" || p === "white-space-collapse") return "text-wrap";
  if (p.startsWith("place") || p.startsWith("align") || p.startsWith("justify")) return "align";
  for (const f of FAMILY_PREFIXES) if (p === f || p.startsWith(f + "-")) return f;
  return p;
}

function organise(input) {
/* ───────────────────────── read the stylesheet ───────────────────────── */

const ast = postcss.parse(input);
const keyframes = []; const rules = []; let seq = 0;
const CONDITIONAL = new Set(["media", "container", "supports"]);

(function walk(node, ctx) {
  node.each((n) => {
    if (n.type === "comment") return;
    if (n.type === "atrule") {
      if (CONDITIONAL.has(n.name)) return walk(n, [...ctx, `@${n.name} ${n.params.replace(/\s+/g, " ").trim()}`]);
      if (n.name === "keyframes" || n.name === "font-face" || n.name === "property") { keyframes.push(n.toString().replace(/\/\*[\s\S]*?\*\//g, "")); return; }
      throw new Error("unhandled at-rule @" + n.name);
    }
    if (n.type !== "rule") throw new Error("unhandled node " + n.type);
    const decls = [];
    n.each((d) => {
      if (d.type === "comment") return;
      if (d.type !== "decl") throw new Error("nested rules are not supported: " + n.selector.slice(0, 80));
      decls.push({ prop: d.prop.startsWith("--") ? d.prop : d.prop.toLowerCase(), value: d.value.replace(/\s+/g, " ").trim(), important: !!d.important });
    });
    for (const rawBranch of splitTop(n.selector.replace(/\/\*[\s\S]*?\*\//g, ""), ",")) {
      const { wrapped, list } = unwrap(rawBranch);
      for (const branch of list) {
        const norm = normaliseComplex(branch);
        const { body, pe } = splitPseudoElement(norm);
        rules.push({
          seq: seq++, ctx: ctx.join(" {"), ctxList: ctx, body, pe,
          // A rule this script already wrote has specificity zero by design.
          spec: wrapped ? [0, 0, 0] : specificity(branch),
          decls: decls.map((d) => ({ ...d })),
        });
      }
    }
  });
})(ast, []);

/* ───────────────────────── 2. precedence order ───────────────────────── */

rules.sort((a, b) => cmp(a.spec, b.spec) || a.seq - b.seq);
rules.forEach((r, i) => { r.order = i; r.key = r.body + r.pe; });

/* ───────────────────────── 4. dead declarations ───────────────────────── */

/* Does every element selector A matches also match selector B? Decided
   only where it follows from the text: B's compounds found, in order, among
   A's, each A compound carrying everything the B compound asks for. */
const partsCache = new Map();
const partsOf = (body) => { let p = partsCache.get(body); if (!p) partsCache.set(body, (p = parseComplex(body))); return p; };
function compoundImplies(a, b) {
  const have = new Set(a.simples.map((x) => x.text));
  return b.simples.every((y) => {
    if (y.kind === "universal" || have.has(y.text)) return true;
    if (y.kind === "pc" && (y.name === "is" || y.name === "where") && y.arg !== null) {
      return splitTop(y.arg, ",").some((alt) => { const ps = partsOf(alt); return ps.length === 1 && compoundImplies(a, ps[0]); });
    }
    // a carries :is(x, y) and every alternative carries what b asks for
    return a.simples.some((x) => x.kind === "pc" && x.name === "is" && x.arg !== null && splitTop(x.arg, ",").every((alt) => { const ps = partsOf(alt); return ps.length === 1 && compoundImplies(ps[0], { simples: [y] }); }));
  });
}
const subCache = new Map();
function subsumes(bodyA, bodyB) { // A ⊆ B
  if (bodyA === bodyB) return true;
  const k = bodyA + "\u0000" + bodyB; if (subCache.has(k)) return subCache.get(k);
  const A = partsOf(bodyA), B = partsOf(bodyB);
  const match = (i, j) => {
    if (!compoundImplies(A[i], B[j])) return false;
    if (j === 0) return true;
    const comb = B[j - 1].value;
    if (i === 0) return false;
    if (comb === " ") {
      for (let k2 = i - 2; k2 >= 0; k2 -= 2) {
        if (A[k2 + 1].value !== " " && A[k2 + 1].value !== ">") return false;
        if (match(k2, j - 2)) return true;
      }
      return false;
    }
    return A[i - 1].value === comb && match(i - 2, j - 2);
  };
  const r = match(A.length - 1, B.length - 1);
  subCache.set(k, r); return r;
}

let removed = 0;
{
  const later = new Map(); // property → [{ body, pe, ctx, important }] from rules further on
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i];
    const beaten = (d) => (later.get(d.prop) || []).some((c) => c.pe === r.pe && (c.ctx === r.ctx || c.ctx === "") && (c.important || !d.important) && subsumes(r.body, c.body));
    const kept = r.decls.filter((d) => { if (beaten(d)) { removed++; return false; } return true; });
    // Inside one rule, an exact repeat of a property keeps only its last
    // value unless one of them is a fallback for the other.
    r.decls = kept.filter((d, k) => !kept.slice(k + 1).some((e) => e.prop === d.prop && e.important === d.important && !RISKY.test(e.value) && !/^-(webkit|moz)-|\b(?:env|image-set|-webkit-[a-z-]+)\(/.test(e.value)) || (removed++, false));
    for (const d of r.decls) {
      if (RISKY.test(d.value) || RISKY.test(d.prop)) continue;
      for (const p of [d.prop, ...(COVERS[d.prop] || [])]) {
        let list = later.get(p); if (!list) later.set(p, (list = []));
        list.push({ body: r.body, pe: r.pe, ctx: r.ctx, important: d.important });
      }
    }
  }
}
const deadClasses = new Map();
let live = rules.filter((r) => { if (!r.decls.length) return false; const d = neverMatches(r.body); if (d) { deadClasses.set(d, (deadClasses.get(d) || 0) + 1); return false; } return true; });

/* ───────────────────────── 5. grouping ───────────────────────── */

/* Which classes can share an element, read from the TSX.
   - A className on a DOM element whose every class value is a literal (or a
     literal start plus a built ending, `a11y-sev-${x}`) is closed: an element
     that carries one of its classes carries only classes of that expression.
   - Anything else is open: a className with a free value (`${className}`), a
     className handed to a component, a class named outside a className.
   Two classes can share an element when one expression names both, or when
   both are open. A closed class also knows which tags it is written on. */
const tokenRe = /a11y-[a-z0-9]+(?:-[a-z0-9]+)*-?/g;
const open = new Set(); const together = new Map(); const tagsOf = new Map();
const knownClass = new Set(); const notClass = new Set();
const pair = (a, b) => { if (a === b) return; if (!together.has(a)) together.set(a, new Set()); if (!together.has(b)) together.set(b, new Set()); together.get(a).add(b); together.get(b).add(a); };
{
  const inClassName = new Set(); // character offsets of tokens accounted for
  const attrRe = /className=/g; let m;
  while ((m = attrRe.exec(sourceText))) {
    let i = m.index + m[0].length; let expr;
    if (sourceText[i] === '"') { const e = sourceText.indexOf('"', i + 1); expr = sourceText.slice(i, e + 1); }
    else if (sourceText[i] === "{") { let d = 0, j = i; for (; j < sourceText.length; j++) { const c = sourceText[j]; if (c === "{") d++; else if (c === "}") { d--; if (d === 0) break; } } expr = sourceText.slice(i, j + 1); }
    else continue;
    const start = i;
    // The tag that owns the attribute: the nearest "<name" before it, unless
    // that tag has already closed (then the owner is unknown).
    const from = Math.max(0, m.index - 6000); const before = sourceText.slice(from, m.index);
    const tags = [...before.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)];
    let tag = "?";
    if (tags.length) {
      const t = tags[tags.length - 1]; tag = t[1];
      let d = 0, q = null;
      for (let k = t.index + t[0].length; k < before.length; k++) {
        const c = before[k];
        if (q) { if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === "`") q = c; else if (c === "{") d++; else if (c === "}") d--;
        else if (c === ">" && d === 0) { tag = "?"; break; }
      }
    }
    const domTag = /^[a-z]/.test(tag);
    // Is every class value in the expression a literal?
    const bare = expr.replace(/a11y-[a-z0-9-]*-\$\{[^{}]*\}/g, "a11yfamily").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    const dynamic = /\$\{\s*[A-Za-z_$][\w.$]*\s*\}/.test(bare) || /^\{\s*[A-Za-z_$][\w.$?]*\s*\}$/.test(bare) ||
      /[?:]\s*[A-Za-z_$][\w.$]*\s*[:)}\],]/.test(bare) || /(\|\||\?\?|\+)\s*[A-Za-z_$]/.test(bare) || /[A-Za-z_$][\w$]*\s*(\|\||\?\?|\+)/.test(bare) ||
      /(^|[^.\w$])[A-Za-z_$][\w$]*\(/.test(bare.replace(/\b(Boolean|String)\b/g, "")) || /[\[,]\s*[A-Za-z_$][\w.$]*\s*[,\]]/.test(bare);
    const toks = [...expr.matchAll(tokenRe)];
    for (const t of toks) inClassName.add(start + t.index);
    const names = toks.map((t) => t[0]);
    if (!domTag || dynamic) names.forEach((c) => open.add(c));
    for (const c of names) { if (!tagsOf.has(c)) tagsOf.set(c, new Set()); tagsOf.get(c).add(domTag ? tag : "?"); }
    for (const a of names) for (const b of names) pair(a, b);
  }
  let t; tokenRe.lastIndex = 0;
  // Names that are not classes being given to an element: ids and the
  // attributes that point at ids, and anything after "." or "#" (a selector
  // in a querySelector string).
  const idRe = /(?:\b(?:id|htmlFor|for|name|key|href|aria-[a-z]+|data-[a-z-]+))=/g;
  while ((m = idRe.exec(sourceText))) {
    let i = m.index + m[0].length, e = i;
    if (sourceText[i] === '"') e = sourceText.indexOf('"', i + 1);
    else if (sourceText[i] === "{") { let d = 0; for (e = i; e < sourceText.length; e++) { const c = sourceText[e]; if (c === "{") d++; else if (c === "}") { d--; if (d === 0) break; } } }
    else continue;
    for (const t of sourceText.slice(i, e + 1).matchAll(tokenRe)) notClass.add(i + t.index);
  }
  while ((t = tokenRe.exec(sourceText))) {
    if (inClassName.has(t.index)) { knownClass.add(t[0]); continue; }
    if (notClass.has(t.index) || sourceText[t.index - 1] === "." || sourceText[t.index - 1] === "#") continue;
    knownClass.add(t[0]); open.add(t[0]);
  }
}
/* A class the stylesheet names → the name the sources know it by: itself, or
   the built family it belongs to ("a11y-sev-critical" → "a11y-sev-"). */
const families = [...knownClass].filter((c) => c.endsWith("-")).sort((a, b) => b.length - a.length);
/* A class written out in one place and built in another ("a11y-btn-sm" and
   `a11y-btn-${size}`) is one of its family: it shares what the family shares. */
for (const c of knownClass) {
  if (c.endsWith("-")) continue;
  for (const f of families) {
    if (!c.startsWith(f)) continue;
    for (const x of together.get(f) || []) pair(c, x);
    pair(c, f);
    for (const d of knownClass) if (d !== c && d.startsWith(f)) pair(c, d);
    if (open.has(f)) open.add(c);
    if (!tagsOf.has(c)) tagsOf.set(c, new Set());
    for (const t of tagsOf.get(f) || ["?"]) tagsOf.get(c).add(t);
  }
}
const resolveCache = new Map();
function resolve(c) {
  if (resolveCache.has(c)) return resolveCache.get(c);
  const r = knownClass.has(c) ? c : families.find((f) => c.startsWith(f)) ?? null;
  resolveCache.set(c, r); return r;
}
const isOpen = (r) => r === null || open.has(r);
function exclusive(a, b) {
  const ra = resolve(a), rb = resolve(b);
  if (ra === null || rb === null || ra === rb) return false;
  if (together.get(ra)?.has(rb)) return false;
  return !isOpen(ra) || !isOpen(rb);
}
/* --model f: write this reading of the markup to f, so it can be checked
   against class lists taken from rendered pages. */
if (args.includes("--model")) {
  fs.writeFileSync(path.resolve(args[args.indexOf("--model") + 1]), JSON.stringify({
    known: [...knownClass], open: [...open], families,
    together: Object.fromEntries([...together].map(([k, v]) => [k, [...v]])),
    tags: Object.fromEntries([...tagsOf].map(([k, v]) => [k, [...v]])),
  }));
}

/** What the subject of a selector must carry: a list of one-of class sets. */
function requirements(body) {
  const parts = parseComplex(body);
  const own = compoundRequirements(parts[parts.length - 1]);
  // Up the chain of child combinators: what the parent, grandparent … carry.
  own.parents = [];
  for (let i = parts.length - 2; i >= 1 && parts[i].type === "comb" && parts[i].value === ">"; i -= 2) own.parents.push(compoundRequirements(parts[i - 1]));
  return own;
}
function compoundRequirements(last) {
  const clauses = [];
  for (const x of last.simples) {
    if (x.kind === "class") clauses.push([x.name]);
    else if (x.kind === "pc" && (x.name === "is" || x.name === "where")) {
      const alts = [];
      let ok = true;
      for (const a of splitTop(x.arg, ",")) {
        const ps = parseComplex(a); const l = ps[ps.length - 1];
        const cls = l.simples.filter((y) => y.kind === "class").map((y) => y.name);
        if (!cls.length) { ok = false; break; }
        alts.push(cls[0]);
      }
      if (ok && alts.length) clauses.push(alts);
    }
  }
  // The tags the subject can be: its type selector, or the tags a closed
  // class of its is written on.
  let types = null;
  const type = last.simples.find((x) => x.kind === "type")?.name ?? null;
  const typeList = last.simples.map((x) => {
    if (x.kind !== "pc" || (x.name !== "is" && x.name !== "where") || x.arg === null) return null;
    const names = splitTop(x.arg, ",").map((alt) => { const ps = parseComplex(alt); return ps[ps.length - 1].simples.find((y) => y.kind === "type")?.name ?? null; });
    return names.every(Boolean) ? names : null;
  }).find(Boolean);
  if (type) types = new Set([type]);
  else if (typeList) types = new Set(typeList);
  else for (const clause of clauses) {
    const sets = clause.map((c) => { const r = resolve(c); return r && !isOpen(r) && tagsOf.has(r) && !tagsOf.get(r).has("?") ? tagsOf.get(r) : null; });
    if (sets.every(Boolean)) { types = new Set(sets.flatMap((t) => [...t])); break; }
  }
  return { clauses, types };
}
const reqCache = new Map();
const req = (body) => { let r = reqCache.get(body); if (!r) reqCache.set(body, (r = requirements(body))); return r; };
const apart = (ra, rb) => {
  if (ra.types && rb.types && ![...ra.types].some((t) => rb.types.has(t))) return true;
  for (const ca of ra.clauses) for (const cb of rb.clauses) if (ca.every((x) => cb.every((y) => exclusive(x, y)))) return true;
  return false;
};
function disjoint(a, b) {
  if (a.pe !== b.pe) return true; // different boxes
  const ra = req(a.body), rb = req(b.body);
  if (apart(ra, rb)) return true;
  // One element has one parent: if the two parents cannot be one element,
  // neither can the subjects (and so on up).
  for (let k = 0; k < Math.min(ra.parents.length, rb.parents.length); k++) if (apart(ra.parents[k], rb.parents[k])) return true;
  return false;
}

/* The sections of the file, and the class prefixes each one holds. */
const AREAS = [
  ["Tokens and base", "widget caps icon print group mode skip only"],
  ["Buttons, fields and shared controls", "btn input select2 switch seg copy show danger lang voice status note dialog progress code accordion datatable dt"],
  ["Shell, sections and navigation", "shell section report newscan"],
  ["Scan form and settings", "url tester settings login scan triage blocked"],
  ["Score summary", "sum dial score spec issue first top"],
  ["Findings and the opened finding", "finding findings sev rule method fd tech occurrence shot picture affected alt fix ai learn principle count"],
  ["Legal standard, checklist and WCAG 2.2", "legal conf acr manual w22 next"],
  ["Designer and developer list, design notes", "undecided dn"],
  ["Screen reader simulation and vision", "sr sim"],
  ["History, statement, report actions, professional", "hist stmt ra audit pro"],
  ["Chat, conversations and Report a barrier", "chat chats prompt prompts barrier"],
];
const areaByWord = new Map(AREAS.flatMap(([name, words]) => words.split(" ").map((w) => [w, name])));
function areaOf(cls) {
  if (cls === "a11y-sr-only") return AREAS[0][0];
  const word = cls.split("-")[1];
  return areaByWord.get(word) ?? AREAS[1][0];
}
/* Section of a rule: by the class of its subject (or nearest ancestor). */
function componentOf(r) {
  const parts = parseComplex(r.body);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].type !== "compound") continue;
    let cls = parts[i].simples.find((x) => x.kind === "class" && x.name !== "a11y-widget-biz")?.name;
    if (!cls) { const is = parts[i].simples.find((x) => x.kind === "pc" && (x.name === "is" || x.name === "where") && /\.a11y-/.test(x.arg)); if (is) cls = /\.(a11y-[\w-]+)/.exec(is.arg)[1]; }
    if (cls) return areaOf(cls);
  }
  return AREAS[0][0];
}

const famIndex = new Map(); const famOf = (p) => { const f = family(p); if (!famIndex.has(f)) famIndex.set(f, famIndex.size); return famIndex.get(f); };
for (const r of live) { r.fams = new Set(); for (const d of r.decls) { r.fams.add(famOf(d.prop)); for (const c of COVERS[d.prop] || []) r.fams.add(famOf(c)); } r.comp = componentOf(r); }
const WORDS = Math.ceil(famIndex.size / 32);
for (const r of live) { r.bits = new Uint32Array(WORDS); for (const f of r.fams) r.bits[f >> 5] |= 1 << (f & 31); }
const shareProps = (a, b) => { for (let w = 0; w < WORDS; w++) if (a.bits[w] & b.bits[w]) return true; return false; };

/* Edge i → j (i must stay before j) for every pair that could disagree. */
const N = live.length;
const succ = Array.from({ length: N }, () => []); const indeg = new Int32Array(N);
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = live[i], b = live[j];
  if (a.key === b.key ? true : shareProps(a, b) && !disjoint(a, b)) {
    succ[i].push(j); indeg[j]++;
  }
}

/* Emit: finish one component before starting the next where the order
   allows; inside a component keep a selector's rules side by side. */
const firstSeq = new Map(AREAS.map(([name], i) => [name, i]));
const done = new Uint8Array(N); const ordered = [];
const byComp = new Map(); live.forEach((r, i) => { if (!byComp.has(r.comp)) byComp.set(r.comp, []); byComp.get(r.comp).push(i); });
const emit = (i) => { done[i] = 1; ordered.push(live[i]); for (const j of succ[i]) indeg[j]--; };
/* How many of a component's remaining rules could go out in one run now. */
function drainable(c) {
  const rest = byComp.get(c).filter((i) => !done[i]); if (!rest.length) return null;
  const inComp = new Set(rest); const deg = new Map(rest.map((i) => [i, indeg[i]]));
  const queue = rest.filter((i) => indeg[i] === 0); let n = 0;
  while (queue.length) { const i = queue.pop(); n++; for (const j of succ[i]) if (inComp.has(j)) { const d = deg.get(j) - 1; deg.set(j, d); if (d === 0) queue.push(j); } }
  return { n, rest: rest.length };
}
let left = N;
while (left) {
  let best = null;
  for (const c of byComp.keys()) {
    const d = drainable(c); if (!d || !d.n) continue;
    // A component that can be finished goes first (the one met first in the
    // old file); otherwise the one that can put out the largest share.
    const score = d.n === d.rest ? [0, firstSeq.get(c)] : [1, -d.n / d.rest, firstSeq.get(c)];
    if (!best || score.some((v, k) => v !== best.score[k]) && score.find((v, k) => v !== best.score[k]) < best.score[score.findIndex((v, k) => v !== best.score[k])]) best = { c, score };
  }
  const current = best.c;
  let lastKey = null;
  for (;;) {
    const ready = byComp.get(current).filter((i) => !done[i] && indeg[i] === 0);
    if (!ready.length) break;
    const pick = ready.find((i) => live[i].key === lastKey && live[i].ctx === "") ?? ready.find((i) => live[i].key === lastKey) ?? ready[0];
    lastKey = live[pick].key; emit(pick); left--;
  }
}

/* ───────────────────────── 6. merge neighbours ───────────────────────── */

const merged = [];
for (const r of ordered) {
  const prev = merged[merged.length - 1];
  if (prev && prev.key === r.key && prev.ctx === r.ctx && prev.selectors.length === 1) {
    for (const d of r.decls) { prev.decls = prev.decls.filter((e) => !(e.prop === d.prop && (d.important || !e.important) && !RISKY.test(d.value))); prev.decls.push(d); }
    continue;
  }
  merged.push({ ...r, selectors: [{ body: r.body, pe: r.pe }], decls: r.decls.map((d) => ({ ...d })) });
}
const declText = (r) => r.decls.map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
const joined = [];
for (const r of merged) {
  const prev = joined[joined.length - 1];
  if (prev && prev.ctx === r.ctx && prev.comp === r.comp && declText(prev) === declText(r)) { prev.selectors.push(...r.selectors); continue; }
  joined.push(r);
}

/* ───────────────────────── write ───────────────────────── */

const selectorText = (r) => {
  // Branches that share a pseudo-element go in one :where().
  const groups = new Map();
  for (const s of r.selectors) { if (!groups.has(s.pe)) groups.set(s.pe, []); groups.get(s.pe).push(s.body); }
  return [...groups].map(([pe, bodies]) => `:where(${bodies.length > 1 ? "\n" + bodies.map((b) => "  " + b).join(",\n") + "\n" : bodies[0]})${pe}`).join(",\n");
};
const indent = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");
let out = `/* The widget's one stylesheet.

   How it is built: every selector is wrapped in :where(), so every rule has
   specificity zero and, where two rules set the same property on the same
   element, the later one in this file wins. Nothing else decides. To change
   how something looks, edit its rule where it stands; never add a stronger
   selector, a repeated class or !important to out-rank it. A rule added
   anywhere, in any style, is sorted into its component by
   \`node scripts/organise-css.mjs\`, which also deletes what a later rule
   overrides. \`npm run lint:css\` fails when the file is not in that form.

   The file has eleven sections, named in the banners. A section comes back
   as "continued" wherever one of its rules has to stand after a rule of
   another section that can style the same element: the order is the
   cascade, so it cannot be moved up. Put a new rule after the last rule
   for the same selector, or at the end of the file, and run the script. */
`;
if (keyframes.length) out += "\n" + keyframes.join("\n") + "\n";
let section = null; let openCtx = []; const seenSections = new Set();
const closeTo = (depth) => { while (openCtx.length > depth) { openCtx.pop(); out += " ".repeat(openCtx.length * 2) + "}\n"; } };
for (const r of joined) {
  if (r.comp !== section) {
      closeTo(0); section = r.comp;
      const again = seenSections.has(section); seenSections.add(section);
      out += again ? `\n/* ── ${section}, continued ── */\n` : `\n\n/* ═══ ${section} ${"═".repeat(Math.max(3, 70 - section.length))} */\n\n`;
    }
  let same = 0; while (same < openCtx.length && same < r.ctxList.length && openCtx[same] === r.ctxList[same]) same++;
  closeTo(same);
  for (const c of r.ctxList.slice(same)) { out += " ".repeat(openCtx.length * 2) + c + " {\n"; openCtx.push(c); }
  const pad = openCtx.length * 2;
  out += indent(`${selectorText(r)} {\n${indent(declText(r), 2)}\n}`, pad) + "\n";
}
closeTo(0);

  const sections = joined.reduce((n, r, i) => n + (i === 0 || joined[i - 1].comp !== r.comp ? 1 : 0), 0);
  return { out, stats: { read: rules.length, removed, written: joined.length, sections, areas: AREAS.length, deadClasses } };
}

const original = fs.readFileSync(CSS, "utf8");
/* A first run changes the order the second one starts from; the second run's
   result is the one that stays put. */
let result = organise(original), passes = 1;
for (; passes < 6; passes++) { const next = organise(result.out); if (next.out === result.out) break; next.stats.read = result.stats.read; next.stats.removed += result.stats.removed; for (const [k, v] of result.stats.deadClasses) next.stats.deadClasses.set(k, v); result = next; }
const { out, stats } = result;

if (CHECK) {
  if (out !== original) { console.error("global.css is not in organised form. Run: node scripts/organise-css.mjs"); process.exit(1); }
  console.log("global.css is in organised form."); process.exit(0);
}
fs.writeFileSync(OUT, out);
console.log(`${stats.read} selector rules read, ${stats.removed} overridden declarations removed, ${stats.written} rules written in ${stats.sections} runs of ${stats.areas} sections, ${(original.length / 1024) | 0} KB → ${(out.length / 1024) | 0} KB`);
if (stats.deadClasses.size) console.log(`rules dropped for classes no source names (${[...stats.deadClasses.values()].reduce((a, b) => a + b, 0)}): ${[...stats.deadClasses.keys()].sort().join(" ")}`);
