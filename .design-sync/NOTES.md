# design-sync notes

**This repo is deliberately NOT a design-sync source. Do not run a
repo → claude.ai/design sync from here.**

Checked 2 August 2026 and declined, for reasons that are structural
rather than temporary:

## The vendoring direction is design → code, one way

`design-system/production/` is a **vendored copy** of the user's
claude.ai/design project "Accessible Scan Design System"
(`64839af2-a0e9-445d-8484-e5109399c984`). It is imported from there and
kept current by copying *down*; nothing originates in the repo copy. Two
changes that might look like local divergence — `DataTable`'s row
`background` support (plus its `.d.ts`) and `tokens/a11y.css` — were both
copied *from* the project into the repo, not authored here.

So a sync in the other direction has no payload: every component, token
and font in the repo copy already exists upstream, unchanged.

## Syncing would also destroy design-side work

The project holds artifacts the repo has no copy of and cannot
regenerate:

- `guidelines/` — 15 foundation specimen cards
- `ui_kits/scan-app/` — the composed app reference (App, NewScan,
  LegalStandard)
- `reference/` — the decoded source card + component bundle
- hand-authored `components/**/*.prompt.md` usage docs

The skill's reconciliation pass deletes every remote path under
`components/`, `tokens/`, `fonts/`, `_vendor/`, `_preview/` and
`guidelines/` that the local bundle does not contain. Running it here
would delete the guidelines outright and overwrite the hand-written
usage docs with generated ones — to upload components the project
already has.

## If the repo ever does need to push something upstream

Use the `DesignSync` tool directly for the specific files, rather than a
whole-repo sync. That writes only what is named and triggers no
reconciliation delete.

## Where the design actually lives in this repo

The applied design is `widget-business/src/styles.css` (a final cascade
layer over the earlier Carbon layer) — not a component library, and not
syncable as one. See `design-system/README.md` for how the system is
applied and which two divergences from it are deliberate (label size,
theme mechanism).

---

## Re-verified 10 August 2026 — conclusion unchanged

`/design-sync` was invoked again. Checked rather than assumed, and the
decision above still stands:

- No Storybook, no `*.stories.*`, no `dist/`. The skill would take the
  package shape and find nothing to build from.
- `design-system/production/` is still a vendored copy — its own README
  calls itself "vendored source of truth".
- The project's `uploads/` holds screenshots from **that same day**, so it
  is in active use. The reconciliation delete would have run against a live
  project.

The one thing that HAS changed since 2 August: the file the note points at
is now `widget-business/src/styles/global.css`, not `styles.css`.

## Drift, design → repo (the direction that is real)

Measured 10 August by listing the project against `production/`:

- **Components: 24 vendored, 43 upstream.** Missing: BeforeAfter, FactCard,
  IndexList, Panel, SectionHead, SpecList, StatCard, StepList, OptionCard,
  Segmented, SelectableTile, Slider, Textarea, RelatedChecks,
  ScreenReaderPreview, SiteAudit, VisionSimulator, HelperNote, **ShellNav**.
- **Tokens:** `space-fluid.css`, `type-scale.css`, `type-semantic.css`
  missing locally; `grid.css` exists locally and not upstream — almost
  certainly a leftover from the superseded "Verify" project.

Several of the missing ones duplicate work done by hand in the widget's
stylesheet — ShellNav most of all, which was rebuilt from scratch as the
Sections rail. Worth pulling before building any more of them.

### Pulled 16 August 2026 — drift closed

All nineteen missing components and all three token files are vendored:
`design-system/production/src/` now carries 43 exports against 43
upstream, and `tokens/` gained space-fluid, type-scale and
type-semantic. Direction was design → repo throughout (get_file only;
nothing written upstream). Every file verified after the pull: jsx/d.ts
pairs present, one named export each, no truncation, no stray
formatting. `grid.css` remains local-only, still presumed a leftover
from the superseded "Verify" project — kept until someone confirms
nothing references it.

## A contrast fault in the design system's own template

`templates/scan-summary/Summary.jsx` sets the "Failing" pill as white on
`--orange-50` (#eb6200): **3.34:1**, below AA. The port in
`widget-business` keeps `--orange-50` for the dial arc, which is
aria-hidden and whose value the label carries, and uses
`--severity-serious-fill` (#ba4e00, 5.03:1) for the pill. Worth fixing
upstream — it is the kind of thing this product exists to catch.

### Resolved upstream, re-checked 13 August 2026

Already fixed in the project, and nothing was written to fix it. The
"Failing" pill is now white on `--red-70` (#a2191f) at **7.79:1**, and
`--orange-50` no longer appears anywhere in the file. Every foreground
and background pair in both `templates/scan-summary/Summary.jsx` and
`ui_kits/scan-app/Summary.jsx` was computed against the project's own
`tokens/colors.css` and every one passes:

| pair | ratio | needs |
|---|---|---|
| "Failing" pill (white on red-70) | 7.79:1 | 4.5 |
| score figure on the cream dial ground | 6.98:1 | 4.5 |
| severity pill, critical | 7.09:1 | 4.5 |
| **severity pill, serious** | **4.58:1** | 4.5 |
| instance count tile (32px) | 4.91:1 | 3.0 |
| "text too faint to read" on gray-90 (40px) | 6.15:1 | 3.0 |

The serious severity pill is the tightest at 4.58:1 — `#ba4e00` on
`--orange-10`. It passes, with 0.08 to spare, so any future darkening of
the tint or lightening of the fill breaks it. Worth knowing before
either is touched.

The lesson is about this file rather than about the design system: a
recorded fault is a claim with a date on it, and this one had been fixed
in between. Re-measure before acting on an entry here — a stale note
sends you to write a fix that would have made a passing pill worse.

Also from that read: `--purple-20` is **#e8daff**. The widget had been
carrying `--purple-15: #ebe2fb`, sampled from a screenshot. Replaced with
the real token.
