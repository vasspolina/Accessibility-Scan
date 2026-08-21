# Locales

The site is built once per locale. `/en/` and `/de/` are primary and first
class: neither is a translation of the other in tone.

```bash
node i18n/build.mjs              # build every locale
node i18n/build.mjs --strict     # fail if a primary locale has an absent key
node i18n/build.mjs --pseudo     # also build /en-XA/, the pseudolocale
node i18n/axe-locales.mjs        # axe-core over every built locale
```

## Why build-time and not runtime

A runtime language swap ships one language in the HTML and repaints the
rest with JavaScript. That means the wrong `lang` on first paint, a flash
of the wrong language, nothing for a crawler, and no page at all without
JS. For a site whose entire argument is accessibility, the language has to
be in the document the screen reader receives.

## Adding a locale

1. `cp messages/de.json messages/fr.json` — you want the key list, not the
   values. Clear the values.
2. Add the code to `PLANNED` in `build.mjs` (or `PRIMARY`, if it is one).
3. Add a row to `LOCALE_DATA`: the `Intl` tag, and any value the copy
   refers to but must not hard-code. Today that is the EUR threshold and
   the door metaphor's height — which must be metric outside English.
4. Add the endonym to `ENDONYM`. Endonyms only: *Français*, never *French*.
   No flags — a flag is a country, not a language.
5. Translate. Read `../docs/TONE-VOICE.md` first, then `notes.json` for the
   strings flagged `voice: metaphor` or `voice: humour`. Those are recreated,
   never translated.
6. `node i18n/build.mjs --strict && node i18n/axe-locales.mjs fr`.

## How a missing translation behaves

- **Absent key** → build error for a primary locale. This is the brief's
  rule and the reason `de.json` carries every key from the day it is
  created.
- **Present but empty** → untranslated. Falls back to the English string,
  so a raw key can never reach the screen, and the build prints the count.

## The pseudolocale

`/en-XA/` accents every vowel and pads each string by about 35% — the
expansion German needs over English. Two things it shows that a translated
build cannot:

- anything on screen **without** accents is a string that never reached the
  catalogue,
- anything that overflows or truncates here will overflow in German.

## What is not in the catalogue, on purpose

- **Impressum and Datenschutzerklärung** stay in German and are reachable
  from every locale. Never machine translated. The voice rules do not apply
  to legal text.
- **WCAG success criterion titles** come from the W3C Authorized
  Translations. We do not render them ourselves.
- **Element screenshots inside an Accessibility Scan report** stay in the
  language of the audited site. Surrounding text must not assume otherwise.
