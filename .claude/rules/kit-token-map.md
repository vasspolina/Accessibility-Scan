---
paths: ["widget-business/src/components/**"]
---

# Porting a UI-kit screen to Foundations v2

The kit (`ui_kits/scan-app/*.jsx` in the design project) is entirely
inline-styled and speaks the design system's **older** token vocabulary.
Foundations v2 — the target — uses different names. There is deliberately **no
alias layer**: every `var()` is rewritten as its screen is ported, so v2 stays
the only vocabulary in this tree.

Counts below are how often each name appears across the kit's 14 screens, so
the top of the table is where the work is.

## The README is not a source for type

Foundations v2 (`styles/tokens.css`) is authoritative for every token value.
The design project's `readme.md` names different type sizes — body 18px, title
20px, heading 40px, display 9rem — and those are **to be ignored**, not
reconciled. Decided 9 Aug 2026, after the question was raised four times. Take
values from v2; take content rules (sentence case, "you/we" never "I", numbers
first, buttons as verbs) from the README as before.

## Direct substitutions

| kit | uses | v2 |
|---|---|---|
| `--space-02` | 5 | `--space-1` (4px) |
| `--space-03` | 20 | `--space-2` (8px) |
| `--space-04` | 46 | `--space-3` (12px) |
| `--space-05` | 74 | `--space-4` (16px) |
| `--space-06` | 52 | `--space-5` (24px) |
| `--space-07` | 24 | `--space-6` (32px) |
| `--space-08` | 23 | `--space-7` (48px) |
| `--space-09` | 12 | `--space-8` (64px) |
| `--text-primary` | 60 | `--content-primary` |
| `--text-secondary` | 51 | `--content-secondary` |
| `--font-sans` | 59 | `--font-core` |
| `--type-label-size` | 59 | `--text-label` |
| `--type-title-size` | 27 | `--text-title` |
| `--type-body-size` | 9 | `--text-body` |
| `--type-heading-size` | 19 | `--text-heading` |
| `--type-display-size` | 8 | `--text-display` |
| `--type-title-lh` | 15 | `--leading-title` |
| `--type-body-lh` | 6 | `--leading-body` |
| `--type-heading-lh` | 8 | `--leading-heading` |
| `--type-display-lh` | 4 | `--leading-display` |
| `--radius-lg` | 25 | `--radius-panel` (both 20px — exact) |
| `--radius-pill` | 15 | `--radius-round` |
| `--layer-01` | 20 | `--surface-sunken` |
| `--gray-100` | 12 | `--surface-inverse` |
| `--background` | 26 | `--surface-page` |
| `--accent-red-fill` | 8 | `--surface-accent` |
| `--text-on-invert` | 9 | `--content-on-inverse` |
| `--text-on-invert-secondary` | 12 | `--content-on-inverse-secondary` |
| `--border-subtle` | 6 | `--border-subtle` (same name) |
| `--measure-max` | 17 | `--measure-max` (same name) |
| `--tracking-tight` | 50 | `--tracking-tight` (same name) |
| `--white` | 13 | `#ffffff` |

## The four that need a decision, not a lookup

**`--text-on-invert-tertiary` (13 uses) → `--content-on-inverse-secondary`.**
v2 has no tertiary on-inverse ink. Map **up**, never down to a light-ground
grey. `#cfc7ba` on `#23201d` is 9.7:1; the naive substitution is 1.8:1. This
exact pairing has now caused six contrast faults in this repo — SpecList
shipped at 1.09:1 on it.

**`--gray-20` / `--gray-30` / `--gray-40` (20 uses combined).** Raw ramp
values with no semantic meaning, so they cannot be mapped mechanically. Look at
what each one is doing: a muted label is `--content-secondary`, a hairline is
`--border-subtle`, a filled surface is `--surface-sunken`. On an inverted
ground they become `--content-on-inverse-secondary`.

**`--severity-*` (e.g. `--severity-pass-ondark-text`, 5 uses).** The app has
SeverityTag with the real ramp. Do not re-map these — render a SeverityTag.

**`--type-*-lh-narrow` and `--type-display-size-fluid`.** No v2 equivalent.
`--leading-body-narrow` is the nearest for the label/title narrow leadings.
Fluid clamps stay as literals: v2's display steps are fixed, so substituting a
token matches at exactly one viewport width and misses everywhere else.

## The recipe

1. Read the kit screen. Its styling is all inline — none of it survives.
2. Create `components/<Name>/` with `.tsx`, `.css`, `index.ts`. The component
   does **not** import its own CSS (shadow root — see `styles/components.css`).
3. Move every inline style into the `.css`, rewriting tokens per the table.
4. Add one `@import` line to `styles/components.css`.
5. Grep the port for leftovers before claiming it is done:
   `grep -E "var\(--(gray-|text-|type-|space-0|radius-(lg|pill)|layer-01|font-sans|accent-red-fill|background|white))" components/<Name>/*`
   It must return nothing.
6. Verify: `npx tsc -b`, `npx vitest run`, and axe in the browser. Measure any
   inverted surface — do not assume it inherited correctly.

## Ported so far

`SinceLastTime` — the pattern reference. Not yet wired; the app's ScanHistory
owns the real comparison data.
