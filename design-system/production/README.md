# @verify/design-system — production package

Ship-as-is React component library + token CSS. No build step required
beyond JSX transpilation (every bundler does this); zero dependencies
besides React 18+.

## Install
Copy this `production/` folder into your repo (e.g. `packages/design-system`)
and add it to your workspace, or point a file dependency at it:

```json
"dependencies": { "@verify/design-system": "file:./packages/design-system" }
```

## Use
```jsx
import "@verify/design-system/styles.css"; // tokens, fonts, focus ring, resets
import { Button, DataTable, SeverityTag } from "@verify/design-system";

<Button onClick={run}>Run scan</Button>
```

Dark theme: set `data-theme="dark"` on `<html>` — nothing else.
Font paths in `tokens/fonts.css` are relative (`../assets/fonts/`); keep
the folder structure or adjust the URLs.

## Rules the code assumes
- Three type sizes only; weights 400/500 (never bold — the font has none).
- All styling flows from the custom properties in `tokens/`; do not
  hardcode colors or sizes in product code.
- See `../system-guide.md` for the full non-negotiable accessibility and
  content rules.

## Contents
- `src/` — 21 components, one file each, named exports + `.d.ts`; `index.js` barrel.
- `styles.css` + `tokens/` — the complete token layer (light + dark).
- `assets/fonts/` — PP Telegraf Regular/Medium OTFs.
