# Reference

`ui-kit.html` — the design system's standalone UI kit, one self-contained file.

## Why this matters

It is the **only** reference in this repo that can be measured rather than
estimated. Everything before it was a screenshot pasted into a chat, and
matching those meant solving sizes from string widths against a scale factor
inferred from the image — which produced four mutually contradictory factors
across five attempts, and answers that were off by 10px on the title and 3px
on card text.

Serve this instead and read `getComputedStyle`. No scale, no inference.

## How to use it

```bash
cp reference/ui-kit.html widget-business/public/ui-kit.html
```

Start the `widget-business` dev server and open `http://localhost:5174/ui-kit.html`.
Screens are addressable by id — `#root-NewScan`, `#root-Checker`, `#root-App`.

The `public/` copy is **gitignored on purpose**: it is 1.5MB and `public/` is
copied into the build. Delete it before any deploy.

```js
// measure a real element, not a picture of one
const root = document.querySelector('#root-NewScan');
const el = [...root.querySelectorAll('*')].find(e => e.textContent.trim() === 'Which site?');
getComputedStyle(el).fontSize;   // exact
```

## What it revealed

The values solved from screenshots were wrong. The kit's actual CSS:

| | solved from images | kit |
|---|---|---|
| title | 134 | **144**, lh 0.88 |
| step numeral / question | 38 | **40** |
| card label | 17/500 | **14/400** |
| card description | 13 | **14** |
| submit | 16 | **18**, 48px tall |
| accent | `#256a41` | `rgb(25,128,56)` |
| content column | 880 | **1000** |
| gutter | 65 | **72** |

Two things worth knowing before copying it wholesale:

- **Card label and description are the same size** (14/400). The hierarchy is
  carried by colour alone, not by size or weight.
- **The step numeral is `#a8a8a8` — 2.5:1 on white, and fails WCAG AA.**
  Matching the kit exactly means shipping that failure. This app uses
  `#767369` (4.74:1) instead.
