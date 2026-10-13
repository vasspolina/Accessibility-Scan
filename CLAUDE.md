# Accessible Scan — project constraints

## Type
- Three fonts: **PP Telegraf Light (300)**, **Regular (400)** and **Medium (500)**. Light is for **display sizes (40px and up) only** — big and thin, never small and thin (user's instruction, 21 Sep 2026; the served file is the family's Light cut, the thinnest we have). No other weights or families (mono is allowed only for meta/labels).
- Font sizes are **literal px values** in the markup — never font tokens or CSS variables for size, weight, or tracking.
- **Minimum size 14px.** Labels, buttons, pills, table headers and inputs use only two sizes: **15px** and **18px**.
- **Chat and report body text is 27px (20pt) at line-height 1.2** (user's instruction, 13 Oct 2026; 20pt rounded to a whole px so it stays literal). It is set on the `.a11y-widget-biz` root, so prose inherits it. Anything that is not prose declares its own size. Titles that sit above prose are **32px** so they stay above it. At 27px, a grid track or flex child needs `minmax(0, 1fr)` / `min-width: 0` and long words need `hyphens: auto; overflow-wrap: break-word`; `npm run check:reflow` catches the rest.
- Letter-spacing is **0.01em** everywhere.

## Layout (Experimental Jetset, 13 Oct 2026 — layout and structure only)
- One alignment axis: flush left, ragged right, nothing centred (a column centred through `align-items` counts).
- Hairlines, not boxes: a neutral fill becomes a 1px `var(--border-subtle)` rule. Colour that carries meaning stays filled: severity, status, the yellow "not a pass" panel, selectable cards, every control.
- No rounded corners. `--radius-sm/md/lg` are 0; only true circles (switch, radio, round numbered badges) keep `--radius-pill`.
- PP Telegraf is unchanged (the palette changed later: see Colour). The override block is the last thing in `global.css`, doubled on the root (0,3,0) so it wins by rank.
- **Before flattening any fill, measure the text on it, in light and dark.** A fill that looks decorative often carries the contrast: the notes panel is `rgb(22,22,22)`, the legal card sits on fixed yellow, and the failing stat tile, current screen-reader row and hovered related card invert. All four measured 1.00 to 1.10:1 when flattened.

## Colour (no red accent, 13 Oct 2026)
- The vermilion accent is gone: titles, numbers, eyebrows, rules, primary buttons and the old red panel are **ink** (`#161616`, a mid grey `#6f6f6f` for filled buttons in dark so white text clears 4.5:1). The accent tokens keep their old names: `--purple-60`, `--purple-70`, `--purple-100` and `--purple-filled` are ink, not purple or vermilion.
- **Red that means something stays**: the "Fix first" severity pill, the critical banner and marks, an invalid input (`--red-*`, `--severity-*`). Do not use them as decoration.
- Ink on a dark ground is invisible. Anything with a black or inverted ground must map its own title and text to `--text-on-invert`; the black tinted band did not, and read 1.00:1 until it did. Measure text on every changed surface, light and dark.

## Everything else
- Colour, spacing, radius, motion still use tokens (`var(--…)`).
