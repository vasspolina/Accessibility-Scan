# Verify design system — vendored source of truth

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
- **14px labels are refused.** The widget's floor is 16px+ — a checker that
  flags small text does not set its own findings small. Labels sit at body
  size, distinguished by weight and colour. (The system-guide agrees in
  principle: every component must pass the checks the product performs.)
- **Theme switching.** The system uses `data-theme="dark"` on the root; the
  widget is embedded on pages that offer no switch, so the same dark tokens
  hang off `prefers-color-scheme` instead.

When the design system updates, diff its `production/tokens/` against the
token values in the widget's Carbon and Verify layers, and re-run the
standing audit (axe matrix + live self-scan) before deploying.
