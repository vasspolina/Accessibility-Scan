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
 * (Hochuli, Detail in typography, "The line": dashes, quotation marks, the
 * ellipsis). The model and the person both write straight quotes, a hyphen
 * for a dash and three full points; these become the typographic signs in
 * the language of the conversation. Code spans and code blocks are never
 * passed through here: their characters are data.
 *
 *   "x"  →  “x”  ‚ „x“ (de), «\u202Fx\u202F» (fr), «x» (es)
 *   'x'  →  ‘x’ (‚x‘ in German); an apostrophe inside a word is ’
 *   " - " and " -- "  →  " – "   (a spaced en dash, as in the reference)
 *   ...  →  …
 */
const QUOTES: Record<string, { d: [string, string]; s: [string, string] }> = {
  en: { d: ["\u201C", "\u201D"], s: ["\u2018", "\u2019"] },
  de: { d: ["\u201E", "\u201C"], s: ["\u201A", "\u2018"] },
  fr: { d: ["\u00AB\u202F", "\u202F\u00BB"], s: ["\u2018", "\u2019"] },
  es: { d: ["\u00AB", "\u00BB"], s: ["\u2018", "\u2019"] },
};

export function smarten(text: string, lang: string): string {
  const q = QUOTES[lang] ?? QUOTES.en;
  return (
    text
      .replace(/\.\.\./g, "\u2026")
      .replace(/(^|[\s(\[])-{1,2}(?=\s)/g, "$1\u2013")
      // An opening mark follows the start, a space or an opening bracket;
      // every other straight mark closes.
      .replace(/(^|[\s(\[\u2013])"/g, `$1${q.d[0]}`)
      .replace(/"/g, q.d[1])
      .replace(/(^|[\s(\[\u2013])'/g, `$1${q.s[0]}`)
      .replace(/'/g, q.s[1])
  );
}

export const __test = { bind, smarten };
