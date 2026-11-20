# Körber design library

Extracted on 9 Nov 2026 from https://www.koerber.com/en. The values come from the site's own stylesheet and from computed styles on the live page. Nothing here was guessed except where a note says so.

- `tokens.css`: primitives, semantic tokens, the five surface themes, the type scale, and button, card, grid and link classes. Everything is prefixed `kb-`.
- `tokens.json`: the same values as data, for Figma Tokens, Style Dictionary or code.
- `specimen.html`: a visual sheet of all of it. Open it in a browser.

## Foundations

**Colour.** The brand is one blue, `#0060ff`, with a 7-step ramp. The page ground is warm grey (`#fbfaf9`) and the ink is a blue-black (`#00050d`), not pure black. Yellow and orange are accents. Hover and border colours are alpha tints of the ink (5–60%) or of white (5–80%). Visited links are `#9747ff` on light grounds and `#feffb0` on dark ones.

**Themes.** The site sets semantic tokens per section with a class: `light` (the default), `mid` (warm grey), `white`, `blue` and `dark`. Here these are `.kb-light`, `.kb-mid`, `.kb-white`, `.kb-blue` and `.kb-dark`. On `blue` and `dark` the accent turns white, so the button becomes white with ink text with no extra rules.

**Type.**

- Headings use `fontKoerber`, a proprietary face with one weight (400). It is **not included**: licence it from Körber, or the stack falls back to Noto Sans.
- Body text is Noto Sans (variable). Taglines are Noto Sans Mono at 12px, uppercase, +0.0262rem.
- Headings get tighter tracking as they grow:

| | phone | from 1100px | line-height |
|---|---|---|---|
| h1 | 40 | 56 | 1.1 |
| h2 | 32 | 48 | 1.2 → 1.1 |
| h3 | 28 | 40 | 1.1 |
| h4 | 24 | 32 | 1.2 |
| h5 | 20 | 24 | 1.4 |
| h6 | 18 | 20 | 1.4 |
| display | clamp(0, 10vw, 40) | clamp(0, 5vw, 80) | 1.2 |

Text sizes are 20, 18, 16, 14 and 12px, in weights 400, 500 and 600.

**Space.** The scale is 4, 8, 16, 20, 24, 32, 40, 48, 56, 64, 80 and 96px. Margin and gutter are 16px, section padding is 48px, the module spacer is 64px and the navigation is 69px tall.

**Radius.** 4, 8, 20, 32 (cards), 40, and 999 (buttons).

**Elevation.** Two shadows, `small` and `medium`. Cards pick up `medium` on hover.

**Motion.** `cubic-bezier(.4,0,.2,1)`: 150ms on buttons, 300ms ease-in-out on card shadows.

**Grid.** 4 columns, then 12 from 768px. The site's media queries are at 600, 1100, 1440, 1536 and 1600px.

## Components

- **Button.** A pill, 44px tall, with padding 10/18/10/24 and the arrow icon at the end. The hero CTA is 56px tall and 18px text, with the arrow in a 50px circle. The outline variant has a 1px border. Disabled buttons are at 50% opacity.
- **Icon button.** A 40–44px circle with a 1px border.
- **Card.** Radius 32, padding 24/20, and a minimum height of 220px (340px from 1100px). The card fill is white on `light` and 80% white on `mid`.

## Not measured

- The site has no `:focus-visible` style on buttons, so the 2px `--kb-focus` outline here is my addition, built on the site's own focus token. On cards the site uses an accent ring with a shadow, and that one is reproduced as it is.
- Button hover. The site animates the arrow instead of changing the colour. Here hover moves to `accent-strong`.
- On light grounds the outline button's border colour was not measured (it only appears on dark sections there). This library uses `border-high-contrast`.
- Forms, toggles, tags and navigation menus have tokens here but no component classes yet.
