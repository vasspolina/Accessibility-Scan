# Accessible Scan design system — vendored source of truth

> **Updated 2 Aug 2026.** The claude.ai/design project was rebuilt as
> **"Accessible Scan Design System"** (project id
> `64839af2-a0e9-445d-8484-e5109399c984`), superseding the "Verify"
> project. Same tokens and component behaviour (verified by diff);
> what changed: component groups (actions/display/navigation/scan…),
> a brand rule — **the logo is the wordmark: "Accessible Scan" in
> PP Telegraf Medium at 28px, never a graphic mark** — a dedicated
> `tokens/a11y.css` (vendored into production/tokens/), filled
> Carbon-style fields, and a scan-app UI kit. The production package
> below remains the installable copy the widget imports.

This is the user's **Accessible Design System** ("Verify"), the design the
business widget follows. Vendored from the design handoff bundle so the
system travels with the code it dresses.

- `system-guide.md` — THE spec: non-negotiable accessibility rules, content
  voice, visual foundations. Read this before styling anything.
- `production/` — the ship-as-is `@verify/design-system` package: 21 React
  components, the token CSS (light + dark), PP Telegraf fonts.
- `screenshots/` — reference renders of the composed UI kit.

## How the widget uses it

The widget does **not** import the React components: it predates them, its
components are specialized (live regions, print, professional mode,
container queries), and the handoff's own top rule is to recreate the
system in the target codebase's patterns. Instead the system is applied as
the final cascade layer in `widget-business/src/styles.css` ("Verify design
system" banner), with the fonts self-hosted at `backend/public/fonts/` and
injected from `widget-business/src/index.tsx`.

Two documented divergences:
- ~~14px labels are refused~~ **Adopted** (1 Aug, evening) at the user's
  pixel-fidelity order for the core.card reference: labels, tags, badges
  and table metadata sit at the system's 14px — above the scanner's own
  13px small-text line. Running prose stays 18px.
- **Theme switching.** The system uses `data-theme="dark"` on the root; the
  widget is embedded on pages that offer no switch, so the same dark tokens
  hang off `prefers-color-scheme` instead.

When the design system updates, diff its `production/tokens/` against the
token values in the widget's Carbon and Verify layers, and re-run the
standing audit (axe matrix + live self-scan) before deploying.
