Build UI in this repo from what already exists. Do not invent UI.

## Read first, before writing a line

1. `CLAUDE.md` — the type rules. They override anything you infer from the code.
2. `.claude/rules/kit-token-map.md` — the kit speaks an older token vocabulary than this tree. Every `var()` gets rewritten on port; there is no alias layer.
3. `widget-business/src/styles/global.css`, the `:root` block — every legal token value.
4. The component you are about to touch, in `widget-business/src/components/`.

Quote the rules that bear on this task back to me before you start, so I know you read them rather than pattern-matched.

## Where things live

- App components: `widget-business/src/components/*.tsx`, imported directly — `import { FindingGroup } from "./components/FindingGroup"`.
- Ported kit components: `widget-business/src/components/<Name>/` with an `index.ts` — Button, Card, Checkbox, DataTable, FactCard, FindingDetail, FixPreviews, Input, IssueRow, OptionCard, Radio, RelatedChecks, ScoreDial, Select2.
- There is **no** top-level `src/components/index.ts`. Do not import from a barrel that does not exist.
- One stylesheet: `widget-business/src/styles/global.css`, inlined into the shadow root by `shadowMount.ts`. Components do not import their own CSS.
- Design sources are read-only, fetched from the claude.ai/design project via DesignSync. `.design-sync/NOTES.md`: this repo is **not** a sync source — the direction is design → code, one way.

## Hard rules

- Reach for an existing component before writing markup. A raw `<button>`/`<input>`/`<table>` in a report section is almost always a component that already exists; inside the kit components themselves, primitives are the point.
- **Type is literal px in the markup — never a token or custom property for size, weight or tracking.** Minimum 14px. Small body text is 15px or 18px, nothing between. Letter-spacing 0.01em everywhere. Only PP Telegraf 400 and 500 — `<strong>` needs an explicit 500 or the browser fakes a 700.
- Colour, spacing, radius and motion **do** use tokens: `var(--space-*)`, `var(--radius-*)`, `var(--gray-*)`, `var(--purple-*)`, `var(--severity-*)`. There is no `--ds-*` prefix here.
- Never remove a focus indicator. `appearance: none` takes the UA ring with it — state the ring yourself when you use it.
- Filter by not rendering, never by `hidden`. A `display` declaration overrides the `hidden` attribute, and that has silently broken a filter in this file before.
- Don't fork a component to vary it. Add the variant where it lives.

## When something is missing

Stop. Don't improvise a value or a variant. Say what is missing and propose the smallest addition — a token in the `:root` block, or a prop on the component. Wait for a yes before editing either.

## Verify by measuring, not by reading

```
cd widget-business && npx tsc -b && npx vitest run && npm run lint:css
```

Then render it and measure. The dev server is `npm run dev` on **5174**; `?fixture=report` renders the full report with no backend (`&audience=professional`, `&scope=site`, `?fixture=error`, `?fixture=blocked` for the others). The Browser pane has been unreliable here — drive Playwright from `backend/` instead, where it is installed.

Every fault worth catching in this file has been invisible from reading the CSS and obvious the moment something measured the rendered result. So measure:

- axe over the subtree you touched — zero critical, zero serious.
- No host page overflow at 1280, 414 and 320.
- Two adjacent inline elements on the same line have a real gap. JSX strips whitespace containing a newline, so `</span>` and `<span>` on separate source lines render welded. This has happened five times.
- Contrast on any surface you changed. An undefined custom property resolves to nothing, the declaration is dropped, and a missing fill has measured 21:1 — which reads as a pass.

**Check that your probe counted something before you believe it.** A probe that finds zero elements satisfies every assertion with nulls and reports a clean pass. That has happened twice.

Report what you used: components, tokens, and anything you had to ask for. If a check fails, fix it in the same turn — never report success on a failed check.

Task: $ARGUMENTS
