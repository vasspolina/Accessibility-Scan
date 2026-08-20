import { describe, it, expect } from "vitest";
import { normalizeLang, setLang, getLang } from "../src/lib/i18n";
import { CHROME_KEYS, t } from "../src/lib/strings";
import { STRINGS_DE } from "../src/lib/strings.de";
import { STRINGS_ES } from "../src/lib/strings.es";
import { STRINGS_FR } from "../src/lib/strings.fr";
import { PLAIN_DE, FIXES_DE, UNDECIDED_DE } from "../src/lib/wcagPlain.de";
import { PLAIN_ES, FIXES_ES, UNDECIDED_ES } from "../src/lib/wcagPlain.es";
import { PLAIN_FR, FIXES_FR, UNDECIDED_FR } from "../src/lib/wcagPlain.fr";
import {
  PLAIN_RULE_EXPLANATIONS,
  PLAIN_RULE_FIXES,
  UNDECIDED_EXPLANATIONS,
  plainForRule,
} from "../src/lib/wcagPlain";

/**
 * Translation guards.
 *
 * These hold at ANY coverage level — the report falls back per key, so a
 * partly-translated language is a valid state and must never fail the build.
 * What they refuse is the two ways a translation can be actively wrong: a
 * key that matches nothing (a typo, or a stale key left behind after the
 * English changed — invisible, because fallback silently serves English),
 * and an empty value (which renders as a blank where a sentence should be).
 */

const LANGS = [
  { code: "de", strings: STRINGS_DE, plain: PLAIN_DE, fixes: FIXES_DE, undecided: UNDECIDED_DE },
  { code: "es", strings: STRINGS_ES, plain: PLAIN_ES, fixes: FIXES_ES, undecided: UNDECIDED_ES },
  { code: "fr", strings: STRINGS_FR, plain: PLAIN_FR, fixes: FIXES_FR, undecided: UNDECIDED_FR },
] as const;

describe("language selection", () => {
  it("normalises anything to a supported language", () => {
    expect(normalizeLang("de-DE")).toBe("de");
    expect(normalizeLang("FR")).toBe("fr");
    expect(normalizeLang("es_MX")).toBe("es");
    expect(normalizeLang("ja")).toBe("en");
    expect(normalizeLang(undefined)).toBe("en");
  });

  it("falls back to the English key when a string is untranslated", () => {
    setLang("de");
    expect(t("__a key no translator will ever write__")).toBe(
      "__a key no translator will ever write__"
    );
    setLang("en");
    expect(getLang()).toBe("en");
  });
});

describe.each(LANGS)("$code translations", ({ code, strings, plain, fixes, undecided }) => {
  it("has no key that matches nothing in English", () => {
    // A stale or mistyped key is invisible at runtime — fallback serves the
    // English string and the translation silently never appears.
    const chrome = new Set(CHROME_KEYS);
    for (const key of Object.keys(strings)) {
      expect(chrome.has(key), `${code}: chrome key not in CHROME_KEYS: "${key}"`).toBe(true);
    }
    for (const key of Object.keys(plain)) {
      expect(key in PLAIN_RULE_EXPLANATIONS, `${code}: unknown rule in PLAIN: ${key}`).toBe(true);
    }
    for (const key of Object.keys(fixes)) {
      expect(key in PLAIN_RULE_FIXES, `${code}: unknown rule in FIXES: ${key}`).toBe(true);
    }
    for (const key of Object.keys(undecided)) {
      expect(key in UNDECIDED_EXPLANATIONS, `${code}: unknown rule in UNDECIDED: ${key}`).toBe(true);
    }
  });

  it("never ships an empty string where a sentence belongs", () => {
    for (const [key, value] of Object.entries(strings)) {
      expect(value.trim().length, `${code}: empty chrome value for "${key}"`).toBeGreaterThan(0);
    }
    for (const [key, rule] of Object.entries(plain)) {
      expect(rule.plain.trim().length, `${code}: empty plain for ${key}`).toBeGreaterThan(0);
      expect(rule.impact.trim().length, `${code}: empty impact for ${key}`).toBeGreaterThan(0);
    }
    for (const [key, entry] of Object.entries(undecided)) {
      expect(entry.what.trim().length, `${code}: empty what for ${key}`).toBeGreaterThan(0);
      expect(entry.ask.trim().length, `${code}: empty ask for ${key}`).toBeGreaterThan(0);
    }
  });

  it("keeps research prose free of digits, as the English rule requires", () => {
    // The English guard exists so a made-up statistic can never reach a
    // reader; a translation that reintroduces digits would reopen exactly
    // that hole in another language.
    for (const [key, rule] of Object.entries(plain)) {
      if (!rule.research) continue;
      expect(/\d/.test(rule.research), `${code}: digits in research for ${key}`).toBe(false);
    }
  });

  it("serves the translation when one exists and English when it does not", () => {
    setLang(code);
    const translated = Object.keys(plain)[0];
    if (translated) {
      expect(plainForRule(translated)?.plain).toBe(plain[translated].plain);
    }
    // A rule this language has not reached still renders — in English.
    const untranslated = Object.keys(PLAIN_RULE_EXPLANATIONS).find((k) => !(k in plain));
    if (untranslated) {
      expect(plainForRule(untranslated)?.plain).toBe(
        PLAIN_RULE_EXPLANATIONS[untranslated].plain
      );
    }
    setLang("en");
  });
});
