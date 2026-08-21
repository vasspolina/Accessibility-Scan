#!/usr/bin/env node
/**
 * WCAG 1.4.10 Reflow, on the checker itself.
 *
 * A tool that sells accessibility has to survive the criterion it sells.
 * 1.4.10 asks for no horizontal scrolling at 320 CSS px, so every fixture
 * state is rendered at 320 and 375 and every element in the shadow root is
 * measured against the viewport.
 *
 * German as well as English: German runs about 35% longer, and a box that
 * fits the English string and not the German one is the commonest way this
 * breaks. The site next door has the same check for the same reason.
 *
 * This is not theoretical. The public site shipped a build whose submit
 * button overflowed a 320px viewport by 98px, and nothing caught it because
 * nothing was looking.
 *
 *   node scripts/reflow-check.mjs          (npm run check:reflow)
 *   node scripts/reflow-check.mjs --keep   leave the dev server running
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Every state the dev harness can render. A state that only exists after a
   submit has to be named — bare ?fixture stops at the form, and measuring
   the form while believing you measured the report is the failure mode this
   file exists to avoid. */
const STATES = [
  ["form", "?fixture"],
  ["report", "?fixture=report"],
  ["pro", "?fixture=report&audience=professional"],
  ["site", "?fixture=report&scope=site"],
  ["error", "?fixture=error"],
  ["blocked", "?fixture=blocked"],
];
const LANGS = ["en", "de"];
const WIDTHS = [320, 375];

/* Vite picks its own port when the configured one is taken, so the port is
   read from its output rather than assumed. Assuming it is how an earlier
   run of this sweep reported 24 clean states while talking to nothing. */
function startVite() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [path.join(ROOT, "node_modules/vite/bin/vite.js"), ROOT],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const timer = setTimeout(() => reject(new Error("vite did not report a port within 60s")), 60_000);
    proc.stdout.on("data", (b) => {
      const m = String(b).match(/localhost:(\d+)/);
      if (m) { clearTimeout(timer); resolve({ proc, port: Number(m[1]) }); }
    });
    proc.on("error", reject);
  });
}

const { proc, port } = await startVite();
const base = `http://localhost:${port}`;
console.log(`dev server on ${port}\n`);

const browser = await chromium.launch();
const failures = [];
let measured = 0;

try {
  for (const [state, query] of STATES) {
    for (const lang of LANGS) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${base}/${query}&lang=${lang}`, { waitUntil: "networkidle" }).catch(() => {});
        await page.waitForTimeout(1200);
        const r = await page.evaluate(() => {
          const sr = document.querySelector("#a11y-widget-business-root")?.shadowRoot;
          if (!sr) return { mounted: false };
          const vw = window.innerWidth;
          const nodes = [...sr.querySelectorAll("*")].filter((e) => e.getClientRects().length);
          const over = nodes
            .filter((e) => {
              if (e.getBoundingClientRect().right <= vw + 1) return false;
              // A deliberately scrollable ancestor (a wide data table) is not
              // a reflow fault — 1.4.10 allows scrolling for such content.
              for (let a = e.parentElement; a; a = a.parentElement) {
                const o = getComputedStyle(a).overflowX;
                if (o === "auto" || o === "scroll") return false;
              }
              return true;
            })
            .map((e) => ({
              sel: e.tagName.toLowerCase() +
                (e.className?.toString?.().trim() ? "." + e.className.toString().trim().split(/\s+/)[0] : ""),
              text: (e.textContent || "").trim().slice(0, 40),
              right: Math.round(e.getBoundingClientRect().right),
            }));
          return {
            mounted: true, examined: nodes.length,
            sideways: document.documentElement.scrollWidth > vw + 1,
            docScrollW: document.documentElement.scrollWidth, over,
          };
        });
        await page.close();

        const label = `${state.padEnd(8)} ${lang} ${String(width).padStart(4)}px`;
        // A state that did not mount proves nothing and must never read as a
        // pass: no elements trivially satisfies "no element overflows".
        if (!r.mounted) {
          console.log(`NOT MOUNTED  ${label}  — nothing was measured`);
          failures.push(`${state}/${lang}/${width}: widget did not mount`);
          continue;
        }
        measured += r.examined;
        if (r.sideways || r.over.length) {
          console.log(`FAIL         ${label}  doc=${r.docScrollW} overflowing=${r.over.length}`);
          for (const o of r.over.slice(0, 4)) console.log(`             ↳ ${o.sel} right=${o.right} "${o.text}"`);
          failures.push(`${state}/${lang}/${width}: ${r.over.length} element(s) past ${width}px`);
        } else {
          console.log(`ok           ${label}  ${r.examined} elements`);
        }
      }
    }
  }
} finally {
  await browser.close();
  if (!process.argv.includes("--keep")) proc.kill();
}

console.log(`\n${measured} element measurements across ${STATES.length * LANGS.length * WIDTHS.length} states.`);
if (failures.length) {
  console.log(`\n${failures.length} reflow failure(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("No reflow failures.");
process.exit(0);
