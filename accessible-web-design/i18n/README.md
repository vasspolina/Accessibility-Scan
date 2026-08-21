# Locales

The site is built once per locale. `/en/` and `/de/` are primary and first
class: neither is a translation of the other in tone.

```bash
npm run build            # build every locale, pseudolocale included
npm run build:strict     # …and fail if a primary locale has an absent key
npm run check:axe        # axe-core over every built page, in every locale
npm run check:expansion  # containers that cannot absorb German's extra 35%
npm run check            # all of the above, in the order CI runs them
```

`npm run check` is what
[`.github/workflows/site-i18n.yml`](../../.github/workflows/site-i18n.yml)
runs on every push that touches this directory. Each step exits non-zero on
a real finding, so the workflow goes red rather than merely printing.

The underlying scripts still take their own flags — `node i18n/build.mjs
--strict --pseudo`, `node i18n/axe-locales.mjs de/index.html` to audit one
page.

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
6. `npm run check` — the new locale is built, audited and measured
   with the rest.

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

`npm run check:expansion` measures the second one rather than leaving it to
the eye: it loads `/en/` and `/en-XA/` at 1280, 768 and 320 px — 320 being
the width WCAG 1.4.10 Reflow names — and reports every element that clips,
truncates, overflows, or carries a fixed px width it cannot grow out of. It
reports containers already broken in English too, marked as such: those are
the same bug one locale earlier, not innocent bystanders.

## The embedded widget

The scanner embedded on the page is a separate product with its own
catalogue, so its strings are not in `messages/`. Two things about it are
this build's business:

- **It follows the page's language, not the visitor's browser.** The
  template carries `data-language="{{__WIDGET_LANG__}}"`, substituted per
  locale in `build.mjs`. A German page embedding an English widget is the
  same mistake as a German page with an English `<html lang>`, only harder
  to notice.
- **It is loaded from the deployed backend**, so the site inherits whatever
  is published there. `check:expansion` skips inside `#a11y-checker` — the
  widget answers for its own layout — but a stale bundle can still break
  this page, and has: an old build overflowed a 320 px viewport by 98 px.

## What is not in the catalogue, on purpose

- **Impressum and Datenschutzerklärung** stay in German and are reachable
  from every locale. Never machine translated. The voice rules do not apply
  to legal text.
- **WCAG success criterion titles** come from the W3C Authorized
  Translations. We do not render them ourselves.
- **Element screenshots inside an Accessibility Scan report** stay in the
  language of the audited site. Surrounding text must not assume otherwise.
