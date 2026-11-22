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
   file exists to avoid.

   It happened anyway (found 20 Nov 2026): when the chat lost "Use the form
   instead" on 18 Nov, the harness could no longer reach the form, every
   named state stayed on the chat landing, and this check measured the
   landing 48 times and passed. So each state now names an element only it
   renders, and a state where that element never shows is a failure, not a
   pass. Bare ?fixture is the chat landing, the default entry since
   1 Oct 2026, hence its name. */
const STATES = [
  ["landing", "?fixture", "#a11y-chat-input"],
  ["report", "?fixture=report", ".a11y-report .a11y-score"],
  ["pro", "?fixture=report&audience=professional", ".a11y-report .a11y-pro-table"],
  ["site", "?fixture=report&scope=site", ".a11y-report .a11y-audit-list"],
  ["error", "?fixture=error", "#a11y-scan-error"],
  ["blocked", "?fixture=blocked", ".a11y-blocked"],
];
const LANGS = ["en", "de", "es", "fr"]; // every language the report ships — a nowrap fault hid in German once
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
      // On CI (CI=true) vite colours its banner and wraps the port in escape
      // codes, "localhost:\u001b[1m5174\u001b[22m", which the match below
      // never saw: the step timed out on every push. Strip them first.
      const text = String(b).replace(/\u001b\[[0-9;]*m/g, "");
      const m = text.match(/localhost:(\d+)/);
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
  for (const [state, query, marker] of STATES) {
    for (const lang of LANGS) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        // "load", then the state's own element: the marker is what says the
        // state is ready, so idle network adds nothing. A whole sweep takes
        // about two and a half minutes (20 Nov 2026).
        await page.goto(`${base}/${query}&lang=${lang}`, { waitUntil: "load" }).catch(() => {});
        await page.waitForFunction((sel) => {
          const el = document.querySelector("#a11y-widget-business-root")?.shadowRoot?.querySelector(sel);
          return !!el && el.getClientRects().length > 0;
        }, marker, { timeout: 20000 }).catch(() => {});
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(1200);
        const r = await page.evaluate((sel) => {
          const sr = document.querySelector("#a11y-widget-business-root")?.shadowRoot;
          if (!sr) return { mounted: false };
          const built = [...sr.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0);
          if (!built) return { mounted: true, built: false };
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
            mounted: true, built: true, examined: nodes.length,
            sideways: document.documentElement.scrollWidth > vw + 1,
            docScrollW: document.documentElement.scrollWidth, over,
          };
        }, marker);
        await page.close();

        const label = `${state.padEnd(8)} ${lang} ${String(width).padStart(4)}px`;
        // A state that did not mount proves nothing and must never read as a
        // pass: no elements trivially satisfies "no element overflows".
        if (!r.mounted) {
          console.log(`NOT MOUNTED  ${label}  — nothing was measured`);
          failures.push(`${state}/${lang}/${width}: widget did not mount`);
          continue;
        }
        if (!r.built) {
          console.log(`NOT BUILT    ${label}  — ${marker} never showed; nothing of this state was measured`);
          failures.push(`${state}/${lang}/${width}: the state was not built (${marker} missing)`);
          continue;
        }
        measured += r.examined;
        if (r.sideways || r.over.length) {
          console.log(`FAIL         ${label}  doc=${r.docScrollW} overflowing=${r.over.length}`);
          for (const o of r.over.slice(0, 4)) console.log(`             ↳ ${o.sel} right=${o.right} "${o.text}"`);
          const first = r.over[0];
          failures.push(`${state}/${lang}/${width}: ${r.over.length} element(s) past ${width}px` +
            (first ? `, first ${first.sel} right=${first.right} "${first.text}"` : ""));
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
  // On GitHub each failure is also an annotation: annotations show on the
  // run's page to anyone, while the step log needs a signed-in, 2FA-checked
  // account (21 Nov 2026: CI failed on every push and the log could not be
  // read from a session, so Railway skipped deploys for an hour unexplained).
  if (process.env.GITHUB_ACTIONS) {
    for (const f of failures) console.log(`::error title=Reflow::${f.replace(/%/g, "%25").replace(/\r?\n/g, " ")}`);
  }
  process.exit(1);
}
console.log("No reflow failures.");
process.exit(0);
