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
