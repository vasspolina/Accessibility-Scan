/**
 * The widget's language. One module-level value, set once at mount, read by
 * every accessor that serves reader-facing copy — the same shape as the
 * report's other cross-cutting state, and deliberately not React context:
 * the language never changes mid-session, and the dictionaries that consume
 * it live in plain modules (wcagPlain, strings), not in the tree.
 *
 * Selection order: the embedder's explicit choice (data-language / the
 * `language` mount option), else the visitor's browser language, else
 * English. The embedder outranks the browser because the report renders
 * inside THEIR page — a German shop showing a German page does not want the
 * report flipping to French for one visitor's browser setting.
 *
 * English is the fallback at every level: a missing translation degrades to
 * the English string, never to a blank or a key.
 */
export type Lang = "en" | "de" | "es" | "fr";

export const SUPPORTED_LANGS: Lang[] = ["en", "de", "es", "fr"];

let current: Lang = "en";

/** Normalises anything ("de-DE", "FR", undefined) to a supported language. */
export function normalizeLang(raw: string | undefined | null): Lang {
  const two = (raw ?? "").trim().slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGS as string[]).includes(two) ? (two as Lang) : "en";
}

export function setLang(raw: string | undefined | null): Lang {
  current = normalizeLang(raw);
  return current;
}

export function getLang(): Lang {
  return current;
}

/** Picks per the selection order documented above. */
export function detectLang(explicit: string | undefined): Lang {
  if (explicit) return normalizeLang(explicit);
  if (typeof navigator !== "undefined") return normalizeLang(navigator.language);
  return "en";
}
