/**
 * Keeps short words attached to the word after them, so a line never ends
 * on a lone "A" or "to".
 *
 * The user's rule (26 Aug 2026): no single letter or single short word left
 * at the end of a line. Typesetters do this with a non-breaking space after
 * one- and two-letter words — the same rule German and Czech composition
 * apply to prepositions. Done here on the rendered text nodes rather than
 * in every string, so it holds for every language and every component,
 * including copy the server writes.
 *
 * A non-breaking space is read as a space by screen readers and copied as
 * one by most clipboards; it changes where lines break and nothing else.
 * Inputs, code and pre are left alone — their whitespace is data.
 */
// Lookbehind rather than a consumed group, so "go to the" binds both words:
// a consumed space is not there for the next match to see.
const SHORT = /(?<=^|[\s\u00A0])([A-Za-zÀ-ÿ]{1,2})[ \t]+(?=\S)/g;
const SKIP = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "CODE", "PRE", "SCRIPT", "STYLE", "KBD", "SAMP"]);
const NBSP = " ";

function bind(text: string): string {
  return text.replace(SHORT, (_m, word: string) => `${word}${NBSP}`);
}

function inSkipped(node: Node): boolean {
  let el: Node | null = node.parentNode;
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    if (SKIP.has((el as Element).tagName) || (el as Element).getAttribute("contenteditable") === "true") return true;
    el = el.parentNode;
  }
  return false;
}

function process(root: Node): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let changed = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (!t.data || t.data.length < 4 || inSkipped(t)) continue;
    const next = bind(t.data);
    if (next !== t.data) {
      t.data = next;
      changed++;
    }
  }
  return changed;
}

/**
 * Applies the rule to everything under `root` now and to anything React
 * renders later. Text nodes React re-renders are rewritten by React and
 * then re-bound here; the observer ignores its own writes because a bound
 * string binds to itself.
 */
export function keepShortWordsAttached(root: Node): () => void {
  process(root);
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      process(root);
    });
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

/**
 * Punctuation the keyboard cannot type, applied to the chat's prose
 * (Hochuli, Detail in typography, "The line", p.36–40, figs 46–53). The
 * model and the person both write straight quotes, a hyphen for a dash and
 * three full points; these become the typographic signs in the language of
 * the conversation. Code spans, code blocks and links are never passed
 * through here: their characters are data.
 *
 * The dash. Hochuli allows two forms, the em dash set close (English and
 * American practice) or the en dash with a space either side (the book's
 * own, Continental), never a hyphen and never a spaced em dash. PP
 * Telegraf's hyphen is 0.47em and its en dash 0.57em, so a spaced en dash
 * cannot be told from a spaced hyphen in this face (measured 18 Oct 2026);
 * English takes the close em dash, which at 0.77em reads as a dash. German,
 * French and Spanish keep their spaced en dash, with a no-break space before
 * it so a line never opens with a dash. A span of figures or words
 * (10:00–18:00, Mon–Fri, 1465–80) is a closed en dash in every language
 * (fig. 49); a date written 2026-10-18 keeps its hyphens.
 *
 *   " - ", " -- ", " – ", "—", " — "  →  "—" (en) / " – " (de, fr, es)
 *   10-12, 1465-80                     →  10–12, 1465–80
 *   "x"   →  ‘x’ (en: single marks first, double inside them, fig. 53)
 *             „x“ (de), « x » (fr), «x» (es)
 *   'x'   →  the marks for a quotation inside one; an apostrophe is ’
 *   ‘not stated,’  →  ‘not stated’,  (a comma or point that is not part of
 *             a short quoted phrase goes outside the marks)
 *   ...   →  …
 *   fr: a narrow no-break space before ; ! ? and a no-break space before :
 *   1280x900  →  1280 x 900, no-break spaces (fig. 52: the x of the face)
 */
type Marks = { d: [string, string]; s: [string, string] };
const QUOTES: Record<string, Marks> = {
  // English: single marks for the frequent quotations, double within them.
  en: { d: ["‘", "’"], s: ["“", "”"] },
  de: { d: ["„", "“"], s: ["‚", "‘"] },
  fr: { d: ["« ", " »"], s: ["‘", "’"] },
  es: { d: ["«", "»"], s: ["‘", "’"] },
};
const DASH: Record<string, string> = { en: "—", de: " – ", fr: " – ", es: " – " };

// What a quotation mark can follow to be an opening one: the start, a
// space, an opening bracket, a dash.
const BEFORE_OPEN = "(^|[\\s(\\[\\u2013\\u2014])";
const LETTER = /\p{L}/u;

export function smarten(text: string, lang: string): string {
  const q = QUOTES[lang] ?? QUOTES.en;
  const dash = DASH[lang] ?? DASH.en;
  let out = text
    .replace(/\.\.\./g, "…")
    // A span: figures (or times, decimals) either side of one hyphen or dash,
    // not part of a longer hyphenated run such as a date.
    .replace(/(?<![\d-])(\d+(?:[.:,]\d+)?)\s?[-–—]\s?(?=\d+(?:[.:,]\d+)?(?![\d-]))/g, "$1–")
    // The dash between words, whatever was typed for it: a hyphen, two, an
    // en dash or an em dash with spaces round it.
    .replace(/[  ]+(?:-{1,2}|–|—)[  ]+/g, dash)
    // One that opens the text stands as a plain en dash.
    .replace(/^(?:-{1,2}|—)(?=\s)/, "–")
    // An unspaced em dash in another language takes that language's form.
    .replace(/(?<=\S)—(?=\S)/g, dash)
    // 1280x900: the x of the typeface, a word space either side that cannot
    // break (the face has no thin space, so none is asked for).
    .replace(/(\d{2,})[  ]?[x×][  ]?(\d{2,})/g, "$1 x $2");
  // Quotation marks, read left to right with the depth of the quotation:
  // the first mark that opens takes the language's primary marks, one opened
  // inside it the nested marks, whichever straight character was typed
  // (fig. 53). A mark opens after the start, a space, a bracket, a dash or
  // another opening mark; otherwise it closes the one it matches. A single
  // mark inside a word (it's) or before a dropped century ('90s) is an
  // apostrophe, and so is one with no single quotation open to close.
  const OPENING = /[\s(\[–—‘“‚„«‹]/;
  const stack: { ch: string; marks: [string, string] }[] = [];
  let res = "";
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (ch !== '"' && ch !== "'") {
      res += ch;
      continue;
    }
    const prev = i > 0 ? out[i - 1] : "";
    const rest = out.slice(i + 1);
    if (ch === "'") {
      const inWord =
        (LETTER.test(prev) && LETTER.test(rest[0] ?? "")) ||
        (!LETTER.test(prev) &&
          (/^\d\ds\b/.test(rest) || (/^\d\d(?![\d'])/.test(rest) && !rest.includes("'"))));
      if (inWord) {
        res += "’";
        continue;
      }
    }
    const opens = prev === "" || OPENING.test(prev);
    if (opens) {
      const marks = stack.length ? q.s : q.d;
      stack.push({ ch, marks });
      res += marks[0];
    } else {
      const at = stack.map((x) => x.ch).lastIndexOf(ch);
      if (at >= 0) {
        res += stack[at].marks[1];
        stack.length = at;
      } else {
        // Nothing of this kind is open: a closing mark whose opening was in
        // an earlier chunk, or the apostrophe of a possessive plural.
        res += ch === '"' ? q.d[1] : "’";
      }
    }
  }
  out = res;
  // A comma or point after a short quoted phrase belongs to the sentence,
  // not to the quotation: ‘not stated’, rather than ‘not stated,’. A quoted
  // sentence (five words or more, or one ending in ? or !) keeps its own.
  const [open, close] = q.d;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  out = out.replace(
    new RegExp(`${esc(open)}([^${esc(close[close.length - 1])}\\n]{1,80}?)([,.])${esc(close)}`, "g"),
    (m, phrase: string, punct: string) =>
      phrase.trim().split(/\s+/).length <= 4 && !/[?!]$/.test(phrase) ? `${open}${phrase}${close}${punct}` : m
  );
  if (lang === "fr") {
    // The spaces French sets before its high punctuation (fig. 41): narrow
    // and unbreakable before ; ! ?, a word space's worth before a colon
    // that follows a word (never inside a time such as 10:00).
    out = out
      .replace(/(\p{L}|\p{N}|[»’)])\s?([;!?])/gu, "$1 $2")
      .replace(/(\p{L})\s?:/gu, "$1 :");
  }
  return out;
}

/** Runs of capitals in prose (WCAG, ARIA, AA, URL) as Hochuli sets
 *  abbreviations (p.39–40, fig. 54): a size smaller and evenly spaced, so
 *  they stop shouting in the line. The regex finds two or more capitals
 *  (figures allowed after the first) standing as a word; MoMA, iOS and a
 *  word's first capital are not runs. Used to wrap them in markup. */
export const CAPS_RUN = /(?<![\p{L}\p{N}])([A-ZÄÖÜ][A-Z0-9ÄÖÜ]+(?:-[A-Z0-9]+)*)(?![\p{L}])/gu;

export const __test = { bind, smarten };
