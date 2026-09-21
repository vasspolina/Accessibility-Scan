# Accessible Scan — project constraints

## Type
- Three fonts: **PP Telegraf Light (300)**, **Regular (400)** and **Medium (500)**. Light is for **display sizes (40px and up) only** — big and thin, never small and thin (user's instruction, 21 Sep 2026; the served file is the family's Light cut, the thinnest we have). No other weights or families (mono is allowed only for meta/labels).
- Font sizes are **literal px values** in the markup — never font tokens or CSS variables for size, weight, or tracking.
- **Minimum size 14px.** Small body text uses only two sizes: **15px** and **18px**.
- Letter-spacing is **0.01em** everywhere.

## Everything else
- Colour, spacing, radius, motion still use tokens (`var(--…)`).
