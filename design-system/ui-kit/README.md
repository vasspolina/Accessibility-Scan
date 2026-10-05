# Scan App UI kit — vendored design reference

Read-only copies of the composed screens from the "Accessible Scan Design
System" project at claude.ai/design (`64839af2-a0e9-445d-8484-e5109399c984`),
imported 2 August 2026. **Reference only — nothing here is built or imported
by the widget.** They exist so the intended anatomy of each screen can be
checked without a round-trip to the design tool.

Every screen composes from `window.AccessibleScanDesignSystem_64839a` — the
same components the widget imports from `@verify/design-system`.

| Screen | What it specifies |
|---|---|
| `NewScan.jsx` | Start-a-scan form — report style, scope, AI review |
| `LegalStandard.jsx` | WCAG 2.1 AA summary — found / clear / needs a person |
| `Perceivable.jsx` | A POUR category section with its findings |
| `TrustIssues.jsx` | Dark-pattern findings, on the critical tint |
| `DesignNotes.jsx` | Advisory remarks with evidence thumbnails |
| `ReportSections.jsx` | Readiness, screen-reader preview, statement |

## The shared anatomy these screens agree on

`ReportSections.jsx` factors it explicitly as its `Section`, and the others
follow the same shape:

- an **eyebrow** — uppercase, label size, medium, secondary colour, tracked
  (`--tracking-caps`) — above the title;
- a **title** with an inline **qualifier** in secondary at weight 400
  (`WCAG 2.2, expected October 2026`, `16 announcements`, `(5)`);
- a **status chip** and an **action button**, right-aligned on the header row;
- a **hairline under the header**, separating it from the body;
- body content, with tables bled flush to the card edges.

The widget implements this via `SectionHeader.tsx` and the
`.a11y-section-eyebrow` / `.a11y-status-chip` rules, adapted where the
widget's own contracts differ — chiefly that its collapsible sections keep a
single `aria-expanded` accordion button as the disclosure, rather than the
kit's separate header action, so the control that opens a region is the
control that announces it.
