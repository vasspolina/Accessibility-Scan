/**
 * Typesetting on the rendered text nodes, so it holds for every language
 * and every component, including copy the server writes. Inputs, code and
 * pre are left alone: their whitespace is data.
 *
 * Short words are no longer tied to the word after them (user's
 * instruction, 18 Nov 2026, "do not rag the text"): the no-break space after
 * every one- and two-letter word, kept since 26 Aug 2026, pushed phrases
 * like "to the" onto the next line and left lines visibly short of the
 * measure. What stays is holdEnds (no word of a sentence alone on a line)
 * and jokkerSpaces (the French thin space drawn in the face).
 */
const SKIP = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "CODE", "PRE", "SCRIPT", "STYLE", "KBD", "SAMP"]);
const NBSP = " ";

/**
 * No word of a sentence alone on a line (user's instruction, 18 Nov 2026,
 * "just don't leave one word from a sentence on the line"). In a run of
 * four words or more, the first word is held to the second and the last to
 * the one before, so a line never ends on a run's opening word or opens on
 * its closing one. A run of two or three words is left breakable: held
 * whole, a two-word German label could not fit 320px.
 *
 * A pair is held only while it is short (HOLD_MAX characters, the space
 * included). Held, "Konformit\u00E4tsbericht f\u00FCr" was one 23-character piece
 * wider than the phone's title bar, and overflow-wrap broke it inside a
 * word, "f|\u00FCr" (user's screenshot, 24 Nov 2026, "optimise properly for
 * mobile"). A word that long fills its own line, so it is never the lone
 * short word the rule is for; 14 characters at 32px is about 230px, inside
 * the narrowest line the report sets.
 */
const WORDS = /[^\s\u00A0]+/g;
const HOLD_MAX = 14;
function holdEnds(text: string): string {
  const words = [...text.matchAll(WORDS)];
  if (words.length < 4) return text;
  const gap = (a: RegExpMatchArray, b: RegExpMatchArray) => [a.index! + a[0].length, b.index!] as const;
  const short = (a: RegExpMatchArray, b: RegExpMatchArray) => a[0].length + 1 + b[0].length <= HOLD_MAX;
  const [s1, e1] = gap(words[0], words[1]);
  const [s2, e2] = gap(words[words.length - 2], words[words.length - 1]);
  const join = (seg: string, hold: boolean) => (hold && /^[\t ]+$/.test(seg) ? NBSP : seg);
  return (
    text.slice(0, s1) +
    join(text.slice(s1, e1), short(words[0], words[1])) +
    text.slice(e1, s2) +
    join(text.slice(s2, e2), short(words[words.length - 2], words[words.length - 1])) +
    text.slice(e2)
  );
}

/**
 * French spaces before ; ! ? and inside « » are the narrow no-break space,
 * U+202F (Hochuli fig. 41), which Jokker does not have: Chromium measured it
 * at 0.095em, drawn from whatever fallback font the reader's system holds.
 * Jokker's own thin space (U+2009, 0.122em measured) is drawn in the face,
 * and a word joiner either side (U+2060, zero width, never drawn, so it needs
 * no glyph) keeps it from breaking: a line can no longer end on « or open
 * on ? (measured, 18 Nov 2026).
 */
const THIN_HELD = "\u2060\u2009\u2060";
function jokkerSpaces(text: string): string {
  return text.includes("\u202F") ? text.replace(/\u202F/g, THIN_HELD) : text;
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
    if (!t.data || inSkipped(t)) continue;
    const spaced = jokkerSpaces(t.data);
    const next = spaced.length < 4 ? spaced : holdEnds(spaced);
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
export function typesetText(root: Node): () => void {
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
 * own, Continental), never a hyphen and never a spaced em dash. Every
 * language takes the book's spaced en dash, with a no-break space before it
 * so a line never opens with a dash. English took the close em dash from
 * 18 Oct 2026 because PP Telegraf's hyphen (0.47em) and en dash (0.57em)
 * were too close to tell apart when spaced. Jokker VF, the face since
 * 19 Oct, has a 0.36em hyphen and a 0.557em en dash, half as wide again, so
 * the reason went with the font and English joined the others (user's
 * instruction, 4 Nov 2026; docs/hochuli-typography-study.html). An em dash,
 * spaced or close, becomes the spaced en dash. A span of figures or words
 * (10:00–18:00, Mon–Fri, 1465–80) is a closed en dash in every language
 * (fig. 49); a date written 2026-10-18 keeps its hyphens.
 *
 *   " - ", " -- ", " – ", "—", " — "  →  " – " (no-break space before)
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
const DASH: Record<string, string> = { en: " – ", de: " – ", fr: " – ", es: " – " };

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
    // An unspaced em dash takes the spaced form too.
    .replace(/(?<=\S)—(?=\S)/g, dash)
    // 1280x900: the x of the typeface between thin spaces (fig. 52). Jokker
    // has a thin space (U+2009, 0.122em); a word joiner either side holds it.
    .replace(/(\d{2,})[  ]?[x×][  ]?(\d{2,})/g, `$1${THIN_HELD}x${THIN_HELD}$2`);
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

/** Straight marks left in interface copy: an apostrophe inside a word
 *  (won't, form's) or after a plural's s (users') becomes ’, and a pair of
 *  straight double marks takes the language's primary quotation marks
 *  (fig. 53). Applied by t(), so every string table is set the same way
 *  without rewriting its keys. */
export function setMarks(text: string, lang: string): string {
  // English takes single marks first (fig. 53); keys typed with curly
  // doubles, “{title}”, take them too, unless a single quotation is inside.
  if (lang === "en" && text.includes("“")) text = text.replace(/“([^“”‘\n]*)”/g, "‘$1’");
  if (!/['"]/.test(text)) return text;
  const [open, close] = (QUOTES[lang] ?? QUOTES.en).d;
  return text
    .replace(/(?<=\p{L})'(?=\p{L})/gu, "’")
    .replace(/(?<=\p{L}s)'(?=[\s.,;:!?)]|$)/gu, "’")
    .replace(/(^|[\s(\[\u2013])"([^"\n]+)"/g, `$1${open}$2${close}`);
}

export const __test = { smarten, holdEnds, jokkerSpaces };
