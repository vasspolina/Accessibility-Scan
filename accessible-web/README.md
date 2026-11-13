# Accessible Web — studio site

The studio's own site: mobile first, light and dark, one face (PP Telegraf
Light, 300). Static HTML, no framework. Separate from `accessible-web-design/`
(the localised scanner site) and its CI.

    python3 build.py

`build.py` holds the copy and the page templates, `illustrations.py` the inline
SVG figures, `style.css` the tokens and layout, `theme.js` the theme button.

- **Name.** Accessible Web in English. BarrierFreeWeb is the German name only:
  a German build changes `BRAND`, `TAG` and `LANG` in `build.py`.
- **Themes.** Follows `prefers-color-scheme`; the button stores a choice in
  `localStorage` (guarded, the page works without it).
- **Colour.** Every text pair clears 4.5:1, most 7:1 (values measured in the
  head of `style.css`). The bright reds and blues are for figures only.
- **Figures** use CSS variables for every fill, so they follow the theme, and
  each carries a title and description.
- **Checked** at 320 and 390px in both themes: no horizontal scroll, axe-core
  (WCAG 2.2 A/AA + best practice) reports no violations on any page.
- **Font licence.** PP Telegraf is a Pangram Pangram face; confirm the licence
  covers web use before this goes public.
