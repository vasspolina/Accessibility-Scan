# BarrierFreeWeb site

A static site, nine pages, no dependencies. The copy and page structure live in
`build.mjs`; the layout lives in `styles.css`.

```bash
node build.mjs            # writes the .html files beside the script
python3 -m http.server 5176   # then open http://localhost:5176
```

The font is Hanken Grotesk (variable, SIL Open Font License, `fonts/OFL.txt`).
Every page was checked with axe-core at 1440px and 320px with no violations and
no horizontal overflow.
