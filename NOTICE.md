# Licence and third-party material

Accessible Scan is © 2026 Polina Vasilyeva and is licensed under the
European Union Public Licence v. 1.2 (EUPL-1.2), in `LICENSE`.
SPDX-License-Identifier: EUPL-1.2

The EUPL covers the code and text written for this project. It does not cover
the files below, which belong to others and are not licensed under the EUPL.
They must be removed or replaced before the repository is made public.

| Path | What it is | Status |
|---|---|---|
| `backend/public/fonts/JokkerVF-TRIAL.woff2` | Jokker, trial licence (kept only for the measurement pages in `docs/`) | Not redistributable; remove |
| `backend/public/fonts/Saans-TRIAL-Light.ttf`, `backend/public/fonts/Serrif-TRIAL-Light.otf` | Displaay Saans and Serrif, trial licence | Not redistributable; replace |
| `backend/public/fonts/PPTelegraf-*.otf`, `accessible-web-design/fonts/PPTelegraf-*.otf`, `barrierfreeweb/fonts/PPTelegraf-*.otf` | PP Telegraf (Pangram Pangram), the widget's and both sites' face | Commercial font; check the licence covers web use before publishing |
| `design-system/`, `reference/` | Vendored design system and its UI kit | Check its terms before publishing |

Bundled dependencies (React, axe-core and others in each package's
`node_modules` and in the built widget files) keep their own licences.
