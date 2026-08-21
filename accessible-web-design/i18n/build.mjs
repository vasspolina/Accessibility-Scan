/**
 * Renders the site once per locale.
 *
 * Build-time rather than runtime on purpose. A runtime swap would ship one
 * language in the HTML and repaint the rest with JavaScript, which means the
 * wrong `lang` on first paint, a flash of the wrong language, nothing for a
 * crawler, and no page at all without JS. For a site whose whole argument is
 * accessibility, the language has to be in the document a screen reader
 * receives — not applied to it afterwards.
 *
 *   node i18n/build.mjs           build every locale
 *   node i18n/build.mjs --strict  fail if a primary locale has an absent key
 *   node i18n/build.mjs --pseudo  also build en-XA, the pseudolocale
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT = ROOT;

/** Primary locales are first class. Neither is a translation of the other. */
const PRIMARY = ["en", "de"];
/** Accepted without a rewrite: drop a messages/<code>.json in and add it here. */
const PLANNED = ["fr", "it", "es", "nl"];

const SITE = "https://barrierfreeweb.de";

/* Values the copy refers to but must never hard-code: each locale writes a
   number its own way, and one of them is a measurement that must not stay
   imperial outside English. */
const LOCALE_DATA = {
  en: { tag: "en", threshold: 2_000_000, height: "5'10\"", dir: "ltr" },
  de: { tag: "de", threshold: 2_000_000, height: "1,78 m", dir: "ltr" },
  fr: { tag: "fr", threshold: 2_000_000, height: "1,78 m", dir: "ltr" },
  it: { tag: "it", threshold: 2_000_000, height: "1,78 m", dir: "ltr" },
  es: { tag: "es", threshold: 2_000_000, height: "1,78 m", dir: "ltr" },
  nl: { tag: "nl", threshold: 2_000_000, height: "1,78 m", dir: "ltr" },
  "en-XA": { tag: "en", threshold: 2_000_000, height: "5'10\"", dir: "ltr" },
};

const ENDONYM = { en: "English", de: "Deutsch", fr: "Français", it: "Italiano", es: "Español", nl: "Nederlands" };

function load(locale) {
  // The pseudolocale has no catalogue of its own: it IS the English one,
  // accented and padded, so that anything unaccented on screen is a string
  // that never reached the catalogue.
  const file = locale === "en-XA" ? "en" : locale;
  const p = path.join(HERE, "messages", `${file}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

/** EUR in the locale's own convention — symbol position and separators differ. */
function money(locale, amount) {
  return new Intl.NumberFormat(locale, {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(amount);
}

/** The long form the tone doc requires: 28 June 2025, 28. Juni 2025. */
export function longDate(locale, iso) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(iso));
}

/* Minimal ICU: {name} substitution, and {n, plural, one{…} other{…}}. The
   catalogue has no plural yet; the parser is here so the first one does not
   arrive as string concatenation, which is what the brief forbids. */
function icu(template, vars, locale) {
  let out = template.replace(/\{(\w+),\s*plural,\s*(.+?)\}\s*$/gs, (_, name, body) => {
    const n = Number(vars[name] ?? 0);
    const cat = new Intl.PluralRules(locale).select(n);
    const arms = {};
    for (const m of body.matchAll(/(\w+)\{([^}]*)\}/g)) arms[m[1]] = m[2];
    return (arms[`=${n}`] ?? arms[cat] ?? arms.other ?? "").replace(/#/g, String(n));
  });
  out = out.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  return out;
}

/** Pseudolocale: accents every vowel and pads by ~35%, the expansion the
 *  brief says German needs. What survives unaccented was never translated;
 *  what breaks the layout here breaks it in German too. */
function pseudo(s) {
  const map = { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" };
  const accented = s.replace(/[aeiouAEIOU]/g, (c) => map[c] ?? c);
  const pad = "·".repeat(Math.ceil(s.length * 0.35));
  return `⟦${accented}${pad}⟧`;
}

function languageSelector(current, locales, page = "") {
  /* A reference implementation, because prospects will screenshot it.
     - endonyms, never flags: a flag is a country, not a language
     - real links, so it works without JS and each locale is a real URL
     - aria-current marks the active one; it is not styled by colour alone
     - the live region announces the change in the language switched TO */
  const items = locales.map((l) => {
    const active = l === current;
    return `        <li>
          <a href="/${l}/${page}" hreflang="${l}" lang="${l}"${active ? ' aria-current="true"' : ""} class="lang-option${active ? " is-current" : ""}">${ENDONYM[l] ?? l}</a>
        </li>`;
  }).join("\n");
  return `      <nav class="lang-switch" aria-label="{{lang.label}}">
        <ul class="lang-list">
${items}
        </ul>
      </nav>
      <p class="visually-hidden" role="status">{{lang.changed}}</p>`;
}

function alternates(locales, page = "") {
  const links = locales.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/${page}" />`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE}/en/${page}" />`);
  return links.map((l) => "  " + l).join("\n");
}

function renderPage(locale, templateFile, outName, ctx) {
  /* Extra pages — the accessibility statement today — go through the same
     catalogue, the same fallback and the same lang stamping as the index.
     A statement that was not translated is worse than none: it is the one
     page a regulator reads. */
  const file = path.join(HERE, "pages", templateFile);
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, "utf8");
  const out = renderInto(html, locale, ctx, { statement: true });
  fs.writeFileSync(path.join(OUT, locale, outName), out);
}

function render(locale, { strict, template, base }) {
  const messages = load(locale);
  const data = LOCALE_DATA[locale] ?? LOCALE_DATA.en;
  const isPseudo = locale === "en-XA";
  const missing = [];
  const untranslated = [];

  const vars = {
    threshold: money(data.tag, data.threshold),
    height: data.height,
  };

  let html = template;

  // The language selector and hreflang block are generated, not authored.
  html = html.replace("{{__LANG_SELECTOR__}}", languageSelector(locale === "en-XA" ? "en" : locale, PRIMARY));
  html = html.replace("{{__ALTERNATES__}}", alternates(PRIMARY));
  html = html.replace("{{__LANG_SELECTOR_STATEMENT__}}", languageSelector(locale === "en-XA" ? "en" : locale, PRIMARY, "statement.html"));
  html = html.replace("{{__ALTERNATES_STATEMENT__}}", alternates(PRIMARY, "statement.html"));

  html = html.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    let value = messages?.[key];
    if (value === undefined) {
      // An ABSENT key is a build error for a primary locale: the brief's rule.
      missing.push(key);
      value = base[key] ?? "";
    } else if (value === "") {
      // PRESENT but empty means untranslated. Falls back to English, so a raw
      // key can never reach the screen — which is the other half of that rule.
      untranslated.push(key);
      value = base[key] ?? "";
    }
    return icu(isPseudo ? pseudo(String(value)) : String(value), vars, data.tag);
  });

  html = html
    .replace('<html lang="en">', `<html lang="${data.tag}" dir="${data.dir}">`)
    .replace("</head>", `  <link rel="canonical" href="${SITE}/${locale}/" />\n</head>`);

  const dir = path.join(OUT, locale);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);

  // Extra pages, rendered with the same substitution the index just used.
  {
    const file = path.join(HERE, "pages", "statement.template.html");
    if (fs.existsSync(file)) {
      let page = fs.readFileSync(file, "utf8");
      page = page.replace("{{__LANG_SELECTOR_STATEMENT__}}", languageSelector(locale === "en-XA" ? "en" : locale, PRIMARY, "statement.html"));
      page = page.replace("{{__ALTERNATES_STATEMENT__}}", alternates(PRIMARY, "statement.html"));
      page = page.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
        let v = messages?.[key];
        if (v === undefined) { missing.push(key); v = base[key] ?? ""; }
        else if (v === "") { untranslated.push(key); v = base[key] ?? ""; }
        return icu(isPseudo ? pseudo(String(v)) : String(v), vars, data.tag);
      });
      page = page.replace('<html lang="en">', `<html lang="${data.tag}" dir="${data.dir}">`);
      fs.writeFileSync(path.join(dir, "statement.html"), page);
    }
  }

  const status = missing.length ? "ABSENT KEYS" : untranslated.length ? `${untranslated.length} untranslated` : "complete";
  console.log(`  /${locale}/  ${status}`);
  if (missing.length) {
    console.log(`     absent: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
    if (strict && PRIMARY.includes(locale)) {
      throw new Error(`${locale}: ${missing.length} absent key(s). A primary locale may not be missing a key.`);
    }
  }
  return { missing, untranslated };
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const withPseudo = args.includes("--pseudo");

const template = fs.readFileSync(path.join(HERE, "template.html"), "utf8");
const base = load("en");
if (!base) throw new Error("messages/en.json is the source of truth and is missing");

console.log("Building locales:");
const locales = [...PRIMARY, ...PLANNED.filter((l) => load(l)), ...(withPseudo ? ["en-XA"] : [])];
for (const l of locales) render(l, { strict, template, base });

/* The root is a signpost, never a redirect: the brief forbids IP-based
   auto-redirect, and a visitor's own choice outranks a guess about them. */
const rootPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BarrierFreeWeb</title>
<link rel="canonical" href="${SITE}/en/" />
${alternates(PRIMARY)}
</head>
<body>
<h1>BarrierFreeWeb</h1>
<nav aria-label="Language">
  <ul>
${PRIMARY.map((l) => `    <li><a href="/${l}/" hreflang="${l}" lang="${l}">${ENDONYM[l]}</a></li>`).join("\n")}
  </ul>
</nav>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), rootPage);
console.log("  /            signpost (no auto-redirect, by design)");
