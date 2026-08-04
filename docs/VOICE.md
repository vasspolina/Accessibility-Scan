# Findings voice guide

How findings text is written for Accessibility Scan, a BarrierFreeWeb product.
The readers are small business owners and enterprise marketing teams. They
decide what to fix and who to hand it to. They do not read axe-core rule IDs.

Findings copy is hand-curated, never generated per scan. The strings live in
`widget-business/src/lib/wcagPlain.ts` (titles, what-we-found, why-it-matters,
fixes, undecided checks) and `widget-business/src/lib/testMethod.ts` (the
who-fixes-this hints). The mechanical rules below are enforced by
`widget-business/test/voice.test.ts` — a new string that breaks them fails CI
rather than reaching a reader.

## Brand voice

We speak human. Clear, informed, quietly witty. Serious about accessibility,
not solemn about it. Four pillars govern the writing:

1. **Intelligent simplicity.** Clean, intentional, stripped of noise. Short
   declarative sentences. Jargon gets translated, never repeated.
2. **Human precision.** Technical but not robotic. Sound like a designer who
   walks the reader through it. No bureaucratic tone. No passive voice. No
   empty authority.
3. **Understated humor.** Dry wit, used the way a designer uses contrast: to
   sharpen, not to shout. In a scan report, allow at most one metaphor per
   report, in the summary only. Never inside a fix instruction. No sarcasm,
   no quirkiness.
4. **Moral clarity.** Accessibility is a shared responsibility, not a favor.
   Assume the reader is intelligent and well meaning. No guilt, no pity, no
   fear based urgency.

Calibration: professional but conversational, closer to a design expert than
to a government PDF. More guidance than command. We inform, we do not lecture.

## Where each piece renders

| Guide concept   | In the product                                          |
| --------------- | ------------------------------------------------------- |
| Title           | `plain` — the finding's heading everywhere it appears   |
| What happens    | `found(count)` or the finding's own description         |
| Who it affects  | `impact` ("Why this matters")                           |
| How to fix      | `PLAIN_RULE_FIXES` / the finding's `suggestedFix`       |
| Where           | selectors and counts, rendered verbatim by the widget   |
| Reference       | severity + WCAG criterion, straight from the scan       |

## Title rules

Name the problem, not the rule. Two to six words, sentence case, no trailing
full stop. Never reuse the axe-core rule ID as a title.

    color-contrast                      -> Text too faint to read
    Buttons must have discernible text  -> Buttons have no label
    image-alt                           -> Images have no description
    aria-hidden-focus                   -> Hidden items still catch keyboard focus

Titles state what was measured and never hedge ("A control", not "Something").

## Language rules

- Plain words only. Cut filler, hedges, and repetition.
- Translate jargon:
  - "programmatically determinable" → software can read it
  - "accessible name" → the label a screen reader reads out
  - "landmark region" → a named section of the page
  - "focusable" → reachable with the Tab key
- Keep code literal and untouched: selectors, attribute names, element names,
  contrast values. Never paraphrase a selector.
- If a technical term cannot be avoided, keep it and define it in one short
  clause.
- Address the reader as "you". Refer to BarrierFreeWeb as "we", sparingly.
- Describe affected people as people, not as a category.

## Style rules

- Sentence case for every heading, caption, and label.
- Sentences under 20 words. Paragraphs no longer than 3 sentences.
- Lists stay clean and parallel, with no full stop at the end of an item.
- No exclamation points, ever.
- Em dashes may replace parentheses, but never more than once per finding
  block. Never inside a selector or a code value.
- Dates in European format (28 June 2025).
- British spelling (colour, recognise), matching the rest of the report.
- Lists carry the technical detail. Prose carries the meaning.

## Accuracy rules

- Never invent a WCAG criterion, severity, or count. Copy what the scan
  supplied.
- Never soften or raise severity to fit the wording.
- Never state or imply that a fix makes a site legally compliant.
- If a finding needs human review, say so plainly instead of a confident
  verdict.
- Research lines name an approved source and contain no digits — numbers
  appear as words, and only where rock solid.
