/**
 * Two checks on src/styles/global.css.
 *
 *   1. var(--x) with no definition and no fallback.
 *      An undefined custom property resolves to nothing. The declaration is
 *      dropped, the element inherits, and the result usually looks
 *      deliberate: a severity pill once shipped with no fill at all because
 *      it named a ramp step that was never defined.
 *
 *   2. The file is in the form scripts/organise-css.mjs writes.
 *      Every selector is wrapped in :where(), so specificity is zero and the
 *      later rule wins; no declaration is left that a later rule overrides.
 *      A rule added with a stronger selector, or one that repeats what a
 *      later rule already says, fails here. The fix is to run
 *      `node scripts/organise-css.mjs` and commit the result.
 *
 * Run: npm run lint:css
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = path.join(root, "src/styles/global.css");
const css = fs.readFileSync(CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

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
  problems.push(`${name} is used ${counts.bare}× with no definition and no fallback: the declaration is dropped and the element inherits`);
}

/* ── 2. organised form ──────────────────────────────────────────────── */
const check = spawnSync(process.execPath, [path.join(root, "scripts/organise-css.mjs"), "--check"], { encoding: "utf8" });
if (check.status !== 0) problems.push((check.stderr || check.stdout || "organise-css --check failed").trim());

console.log(`checked ${(css.match(/\{/g) || []).length} blocks, ${defined.size} custom properties`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\nclean");
