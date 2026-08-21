/**
 * What breaks when the text gets longer.
 *
 * German runs roughly 35% longer than English, and the pseudolocale pads by
 * exactly that. Anything that clips or truncates in /en-XA/ is a container
 * that will break in German — found before the translation lands rather
 * than after.
 *
 * It reports everything broken in the pseudolocale, not only what is newly
 * broken there. A container that already truncates in English is not an
 * innocent bystander; it is the same bug, one locale earlier.
 *
 *   node i18n/expansion-check.mjs      (npm run check:expansion)
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/* 320 is the width WCAG 1.4.10 Reflow names, so it is the one that matters
   most; the wider two catch containers that only fail once a line wraps. */
const WIDTHS = [1280, 768, 320];

async function measure(page, file, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("file://" + path.join(ROOT, file), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const found = {};
    for (const el of document.querySelectorAll("body *")) {
      // The embedded widget is a separate product with its own tests, and
      // its shadow root is not this site's layout to answer for.
      if (!el.getClientRects().length || el.closest("#a11y-checker")) continue;
      const cs = getComputedStyle(el);
      const scrolls = cs.overflowX === "auto" || cs.overflowX === "scroll";
      const over = el.scrollWidth > el.clientWidth + 1;
      const label = el.tagName.toLowerCase() +
        (el.className?.toString?.().trim() ? "." + el.className.toString().trim().split(/\s+/)[0] : "");
      const why = [];
      // Text cut off behind an ellipsis: the label is unreadable, not merely tight.
      if (over && cs.textOverflow === "ellipsis") why.push("truncated");
      // Content wider than its box with no way to reach it.
      else if (over && !scrolls && cs.overflowX === "hidden") why.push("clipped");
      // Content spilling past its box entirely.
      else if (over && !scrolls) why.push("overflows");
      // A px width on a text-bearing leaf is the shape that cannot absorb 35%.
      if (/^\d/.test(cs.width) && cs.maxWidth === "none" && !el.childElementCount &&
          (el.textContent || "").trim() && parseFloat(cs.width) > 40 &&
          el.scrollWidth > el.clientWidth + 1) why.push("fixed-width");
      if (why.length) (found[label] ||= new Set()) && why.forEach((w) => found[label].add(w));
    }
    return {
      elements: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v]])),
      pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

const b = await chromium.launch();
const p = await b.newPage();
let problems = 0;
for (const width of WIDTHS) {
  const en = await measure(p, "en/index.html", width);
  const xa = await measure(p, "en-XA/index.html", width);
  console.log(`\n${width}px`);
  if (xa.pageScrollsSideways) {
    console.log(`  PAGE SCROLLS SIDEWAYS${en.pageScrollsSideways ? " (in English too)" : " under expansion"}`);
    problems++;
  }
  const broken = Object.entries(xa.elements);
  if (!broken.length) {
    if (!xa.pageScrollsSideways) console.log("  nothing breaks under 35% expansion");
    continue;
  }
  for (const [sel, kinds] of broken) {
    const alsoEn = en.elements[sel] ? "  (already in English)" : "  (only once expanded)";
    console.log(`  ${sel}  ${kinds.join(", ")}${alsoEn}`);
    problems++;
  }
}
await b.close();
if (problems) {
  console.log(`\n${problems} container(s) would break in German. Fix before the locale ships.`);
  process.exit(1);
}
console.log("\nNo expansion problems.");
process.exit(0);
