# Accessible Web — studio site

The studio's own site: mobile first, light and dark, one face (PP Telegraf
Light, 300). Static HTML, no framework. Separate from `accessible-web-design/`
(the localised scanner site) and its CI.

    python3 build.py

`build.py` holds the copy and the page template, `posters.py` the posters,
`style.css` the tokens and layout, `theme.js` the theme button, the menu pill
and the galleries.

- **Layout** follows a Source Type product page: round button and dark pill at
  the top, a centred two-line title, posters on a black stage with a counter,
  a narrow text column, a Related grid.
- **Posters** are set like the reference event posters. The Touch, See, Hear,
  Speak series redraws Microsoft Inclusive Design's Persona Spectrum (credited
  on each poster and on the Accessibility page); the other four are the WCAG
  principles, plus Entrance and EAA for the studio.

- **Name.** Accessible Web in English. BarrierFreeWeb is the German name only:
  a German build changes `BRAND`, `TAG` and `LANG` in `build.py`.
- **Themes.** Follows `prefers-color-scheme`; the button stores a choice in
  `localStorage` (guarded, the page works without it).
- **Colour.** Every text pair clears 4.5:1, most 7:1 (values measured in the
  head of `style.css`). The bright reds and blues are for figures only.
- **Posters** keep fixed colours (they are objects on a black stage) and each
  carries a title and a description that includes its words.
- **Checked** at 320 and 390px in both themes: no horizontal scroll, axe-core
  (WCAG 2.2 A/AA + best practice) reports no violations on any page.
- **Font licence.** PP Telegraf is a Pangram Pangram face; confirm the licence
  covers web use before this goes public.
