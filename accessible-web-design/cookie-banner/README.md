# Accessible consent banner

A cookie banner for EU sites that a screen reader can read past, a keyboard can
operate, and a regulator can live with. Three files, no dependencies.

- `consent.css` — styles, themable through custom properties on `.consent`
- `consent.js` — behaviour and the `window.consent` API
- `consent.en.html` / `consent.de.html` — the markup, in English and German

Install: copy the three files, load consent.css before your own stylesheet so
your colours win, paste the markup from the snippet where the
comments say, change the privacy-policy link and the category texts, and mark
every script that needs consent as `type="text/plain" data-consent="<category>"`.

The page `/en/cookie-banner.html` on barrierfreeweb.de documents the design
decisions and shows the banner running.

## The builder

`builder.js` + `builder_page.py` add a "Make yours" form to every kit page:
language, policy link, categories in the site's own words, light-mode
colours. It writes the snippet, appends the colours to consent.css, checks
every colour pair against WCAG, runs the result in a preview frame, and
zips the three files. Nothing typed leaves the page. The generated wording
lives in `builder_page.py` (GEN) and mirrors consent.en/de.html: change both
together.

## Rebuilding the pages

`build.py` writes `en/cookie-banner.html` and `de/cookie-banner.html` from the
kit files; `npm run build` runs it after the locale build, since `en/` and `de/`
are generated output and not committed.
