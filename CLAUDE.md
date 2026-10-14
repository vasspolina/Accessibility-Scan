# Accessible Scan — project constraints

## Type
- Three fonts: **PP Telegraf Light (300)**, **Regular (400)** and **Medium (500)**. Light is for **display sizes (40px and up) only** — big and thin, never small and thin (user's instruction, 21 Sep 2026; the served file is the family's Light cut, the thinnest we have). No other weights or families (mono is allowed only for meta/labels).
- Font sizes are **literal px values** in the markup — never font tokens or CSS variables for size, weight, or tracking.
- **Minimum size 14px.** Labels, buttons, pills, table headers and inputs use only two sizes: **15px** and **18px**.
- **Chat and report body text is 27px (20pt) at line-height 1.2** (user's instruction, 13 Oct 2026; 20pt rounded to a whole px so it stays literal). It is set on the `.a11y-widget-biz` root, so prose inherits it. Anything that is not prose declares its own size. Titles that sit above prose are **32px** so they stay above it. At 27px, a grid track or flex child needs `minmax(0, 1fr)` / `min-width: 0` and long words need `hyphens: auto; overflow-wrap: break-word`; `npm run check:reflow` catches the rest, **but only with the fallback font CI has**: this sandbox falls back to a narrow font and passed while CI failed in German at 320px. Run it with a wide default, e.g. a fontconfig file that prepends `DejaVu Sans` for `sans-serif` and `PP Telegraf`, via `FONTCONFIG_FILE=… CI=true npm run check:reflow`.
- Letter-spacing is **0.01em** everywhere.

## Layout (Experimental Jetset, 13 Oct 2026 — layout and structure only)
- One alignment axis: flush left, ragged right, nothing centred (a column centred through `align-items` counts).
- Hairlines, not boxes: a neutral fill becomes a 1px `var(--border-subtle)` rule.
- **Round: buttons and the chat window, nothing else** (user's instruction, 14 Oct 2026). Every button is a pill (`--radius-pill`), the small row toggles are circles, and the conversation and the line you type in are two rounded panes (28px, 2px ink edge). Section bars, cards, tables, slabs and inputs outside the chat stay square: `--radius-sm/md/lg` are still 0.
- PP Telegraf is unchanged (the palette changed later: see Colour). The override block is the last thing in `global.css`, doubled on the root (0,3,0) so it wins by rank.
- **Before flattening any fill, measure the text on it, in light and dark.** A fill that looks decorative often carries the contrast: the notes panel is `rgb(22,22,22)`, the legal card sits on fixed yellow, and the failing stat tile, current screen-reader row and hovered related card invert. All four measured 1.00 to 1.10:1 when flattened.

- **No badges across the content** (user's instruction, 14 Oct 2026). A word is not boxed because it is short: no pills, chips or tags around counts, WCAG numbers, rule ids, fix types, standards or section labels, and no "Fastest" / "Most chosen" on controls. Colour that carries meaning keeps its box: severity, triage state, the legal status marks, round numbered markers. Before adding a bordered or filled span, ask what the box says that the word does not.
- **One of each.** One navigation: the Sections rail (the top bar is the brand and the run controls, no links). One set of report settings on screen at a time: the form owns Report style, Language, AI review and Scope while it is showing, so the rail does not repeat them; the conversation shows them as a block when asked. Before adding a control, search the page for one that already does the job.

## Chat typesetting (Hochuli, *Detail in typography*; user's reference, 14 Oct 2026)
- The conversation is set as an interview: the speaker hung in the 4.5em gutter on the first line's baseline (18px, roman, secondary ink), the words beside it at 27px/1.2 on a 60ch measure.
- Inside a turn, no space between paragraphs; every paragraph has a first-line indent (2em, 1.2em on a phone). Between turns, one line (1.2em) and nothing else: no rules, no grounds.
- List markers hang outside the block (an en dash, or the figure and its point); the list keeps its markers so it keeps its role. On a phone they come inside.
- Code is an inserted passage: 18px on the text's own 32.4px line, so it stays in register and the text after it returns to the grid; one line of space above and below.
- A soft rag: `text-wrap: pretty`, `hyphenate-limit-chars: 7 3 3`, hyphens on. Emphasis is Medium (500), never a synthesized bold; there is no italic cut, and a sloped roman is not an italic, so questions are told from answers by the label alone.
- Punctuation is set in `lib/typography.ts` `smarten()` on prose only (never code): quotation marks in the conversation's language (“ ” / „ “ / « » / « »), the apostrophe, a spaced en dash for " - ", the ellipsis. Hochuli's rules for what a keyboard cannot type.

## Colour: strictly black and white (user's instruction, 14 Oct 2026)
- **The only colours are `#000` and `#fff`, in every state, light and dark.** No greys, no tints, no hue, no opacity below 1. The tokens keep their old names (`--purple-60`, `--red-*`, `--gray-*`) but every value is black or white; `--ink` and `--paper` are the two roles, and they swap in dark (`prefers-color-scheme` and `data-theme`), so ink is black on white and white on black.
- Every border, outline and rule is `var(--ink)`. A surface is paper or ink; text on it is the other one (21:1). A dark slab with light text is allowed (`.a11y-section-tint`, `.a11y-pro-scorecard`, the failing stat tile); a slab whose text depended on a mid-grey is paper with a 2px ink edge.
- **What colour used to say is said by shape.** Severity: Fix first is solid ink; Fix soon is a solid 2px edge on paper; Fix eventually is dashed; Minor polish is dotted. The legal marks follow the same ladder. The score dial is a solid arc on a dotted track, the meter a solid bar with ticks at 70 and 90. A disabled control is a dashed edge on paper, never faded (fading is grey). Focus is a paper ring then an ink ring, so one always shows. Pictures of the customer's page are `grayscale(1)`; the vision simulator is exempt because its colour is the point.
- Before adding a colour, a grey or an `opacity`, stop: there is nothing to add it to. To check a change, run the colour census (every computed colour in every state, light and dark, must be black, white or transparent) and a text-on-ground measurement; both were zero-failure when this rule was written.

## Everything else
- Colour, spacing, radius, motion still use tokens (`var(--…)`).

## Shipping
- Merging to `main` deploys the Railway service from `backend/` (Dockerfile, root directory `backend`). The widget is served from the committed `backend/public/widget-business.js`, which the image copies as-is: **rebuild and commit the bundle in the same change as any widget source edit** (`cd backend && npm run build:widget-business`). `/healthz` reports the deployed `commit` and a `widgetBundle` fingerprint; check it before concluding a deploy did not happen.
