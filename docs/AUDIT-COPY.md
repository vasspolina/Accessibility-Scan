# Audit copy rules

The rules for every finding this product writes — titles, impact, fixes.
The reader is a product team that must fix the issue; every sentence must
survive the question "what does the reader do differently after reading
this?" Pasted by the owner on 22 August 2026; the mechanically checkable
half is enforced by `backend/test/auditCopy.test.ts` over the rendered
findings the fixture suite materialises, and by the widget's voice suite
over its plain-language layer.

## Banned phrasing

- No filler openers: "In today's digital landscape", "It's worth noting
  that", "Let's dive in", "In conclusion".
- No "not just X, but Y" / "isn't merely" / "at its core" / "serves as a
  testament to".
- No inflation adjectives: seamless, robust, comprehensive, holistic,
  cutting edge, powerful, crucial, vital, key, essential.
  (The word "Robust" survives in exactly one place: the name of WCAG's
  fourth principle and its criterion rows, which are the standard's own.)
- No verbs: delve, leverage, utilize, empower, unlock, ensure (when it
  means "make sure"), foster, navigate (figurative).
- No rhetorical questions. (The conformance table's per-criterion question
  — "Do images have a description?" — is not rhetoric: it is the question
  the row answers, and the row answers it. Findings text takes the ban.)
- No triadic lists. Two items or four, never three in a row.
- No closing paragraph that restates the section above it.
- No hedges stacked on hedges: "may potentially", "could possibly".
- Em dashes are permitted per the tone doc. One per paragraph maximum.

## Banned substance

- Never call a page "compliant" or "accessible". Name which success
  criteria passed, under which test method.
- Never restate the axe-core rule ID as if it were an explanation.
  Translate it into what a person hits.
- Never invent a WCAG number. If not certain of the criterion or its
  level, write UNVERIFIED and stop.
- Never assign a severity without a reason tied to user impact.
- Never pad a section because a template has a slot for it. An empty
  section is deleted, not filled.

## Required structure per issue

1. Title: under 8 words, plain language, names the thing that is broken.
   "Cookie banner traps keyboard focus", not "Focus management deficiency".
2. Location: exact selector plus page URL. One issue, one locator. If the
   same defect repeats, say how many instances and list three examples
   with a count for the rest.
3. Impact: one or two sentences. Who is blocked, and from what. Name the
   assistive technology or the input method, not a persona story.
4. Criterion: WCAG number, name, level. (This product cites WCAG 2.1
   numbers because EN 301 549 does; the numbering is identical in 2.2.)
5. Method: AUTOMATED (axe-core) or MANUAL (human confirmed). Label every
   issue. Never blur the two. (This product has a third source — the AI
   review — which must be labelled as itself, never as either.)
6. Fix: the actual change. Attribute, markup, or behaviour. Code snippet
   where a snippet is shorter than the prose.

## Voice

- Second person for the fix, third person for the impact.
- Present tense. Active voice. Subject before verb.
- Prefer the short word. "Use" over "utilise". "Show" over "surface".
- Vary sentence length deliberately.
- No jargon a designer outside accessibility work would need to look up.
  An unavoidable term is defined once, inline, in six words or fewer.
- No apology, no congratulation, no editorialising about how important
  accessibility is. The reader already bought the scan.

## Self check before output

a) Delete every adjective. Same information? Leave it deleted.
b) Can a developer act on this issue without opening another tab?
c) Does any sentence describe the checker rather than the user?
d) Count the banned words. The answer must be zero.
e) Would this text read identically for any other website? Then it is
   generic — rewrite with the specifics of this scan.
