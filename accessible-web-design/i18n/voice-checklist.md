# Voice checklist, per locale

Run before a locale ships. The authority is `../docs/TONE-VOICE.md`; the
German additions are in the German voice brief. Mechanical rules are
enforced in the Accessibility Scan repo by `test/voice.de.test.ts` — this
list is for the site, where a human reads the page.

## Mechanical — check every string

- [ ] Sentence case for headings, captions, and UI text. German noun
      capitalisation is orthography, not a style choice, and stays
- [ ] Every sentence under 20 words
- [ ] Paragraphs of at most three sentences
- [ ] No exclamation points. Including German and Spanish UI copy, where
      they are conventional
- [ ] List items parallel in structure, no full stop at the end
- [ ] Dates in long form: 28 June 2025 · 28. Juni 2025 · 28 juin 2025.
      Never numeric
- [ ] No imperial measurement outside English (1,78 m, not 5'10")
- [ ] Currency and numbers via `Intl`, never hard-coded

## Register

- [ ] de: Sie throughout, never du · fr: vous · it: Lei · es: one of tú or
      usted, held site-wide
- [ ] Active voice. German and French technical writing default to the
      passive and the nominal style; counter it deliberately
- [ ] First person plural used sparingly. Collective, not corporate

## Typography

- [ ] en: em dash may replace parentheses, sparingly
- [ ] de: spaced en dash instead, quotation marks „ und “
- [ ] fr: narrow non-breaking space before ; : ? ! and guillemets « »
- [ ] es: inverted opening marks for questions

## Content

- [ ] No overpromise: "fully compliant", "guaranteed", "no fines" are
      forbidden in every locale. A site can be compliant; none is fully
      accessible
- [ ] No fear-based urgency. No fine as a headline, no countdown. German
      accessibility marketing runs on fear, which is exactly why ours does
      not
- [ ] Metaphors recreated, not translated. Where an image has no local
      equivalent, propose a replacement and flag it
- [ ] Standards named officially in the target language, never rendered
      literally
- [ ] One term per concept, from `glossary.md`, used site-wide

## Accessible names

- [ ] alt text, aria-label, visually hidden text, skip link, form errors,
      `<title>`, meta description and OG tags all translated
- [ ] Alt text plain and descriptive. No wit

## The read-aloud test

Read the page aloud in the target language. If a sentence needs a second
breath, cut it. If a paragraph could appear on a competitor's site
unchanged, it is not our voice yet.
