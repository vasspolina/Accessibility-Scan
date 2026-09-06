# Readability and structure audit of the report

**Date:** 26 August 2026 · **Scope:** the report the widget renders, in both
audiences, as the fixture harness produces it (nine findings, 26 undecided
items, 22 open criteria). **Method:** measured from the rendered page —
visible words, sentences, sentence length, paragraphs over 60 words,
collapsed controls, Flesch–Kincaid grade, section height, and sentences
that appear more than once. Numbers below are for the "For everyone"
view unless stated.

## Verdict

The sentences are fine. The structure is not. Reading grade sits at 4–6
for nearly every section, long sentences are rare (four over 25 words in
2,099), and the copy sweep earlier today removed the slogans. What makes
the report hard to read is the amount of it, the order it comes in, and
how much of it says the same thing twice.

## Findings

### 1. It is 2,099 words and 12,910px tall before anything is opened
Sixteen sections in the rail. At an ordinary reading pace that is eight to
ten minutes of scrolling for a page with nine findings. The professional
view is 619 words and 8,813px. A report is read to find out what to fix;
most of this length is context around that answer.

### 2. The findings come eighth
Order today: Score → Do you meet the legal standard? (1,690px) → So
"nothing found" is not a pass → What this tells you → Automated check
results → Ready for WCAG 2.2? → What costs you trust → **What people can't
use (8)**. The nine faults the page was scanned for begin roughly 5,500px
down, after four sections of legal framing. Every reader who came for
"what is wrong" scrolls past the explanation of what a pass would mean.

### 3. Thirty-eight sentences appear twice
The legal-standard section renders its two panels ("So 'nothing found' is
not a pass", "What this tells you") and then repeats both, word for word,
as a plain-text block beneath them — seven sentences, twice each, in both
audiences. In the designer-and-developer section, the per-item guidance
("What to ask for: ask your designer to check each one against the
picture…", "Where the words are lost, they need a solid panel behind
them…") is printed in full under every item of the same kind, so the same
four sentences recur across the 26 items.

### 4. One section is 55 % of the page
"For your designer and developer (26)" is 1,159 words, 82 sentences, six
paragraphs over 60 words, all 26 items open by default. It is the densest
block in the report and it is aimed at the people least likely to be the
reader of this view. Nothing in it counts against the score, which the
section itself says.

### 5. One topic, four rail entries
"Do you meet the legal standard?", "So 'nothing found' is not a pass",
"What this tells you" and "Automated check results" are four separate
landmarked sections and four rail links. They are one topic with three
sub-parts. The rail lists sixteen things; a reader orienting by it is
choosing among parts of the same answer.

### 6. The professional findings table has no heading of its own
In the professional view the findings table sits in a section the rail
shows as "(none)": nine collapsed rows, 974px, with the only heading being
the score block's. A screen-reader user jumping by heading skips it.

### 7. Two sentences that are one sentence too long
The scan summary's caveat is a single 38-word sentence (grade 9.5). The
accessibility statement has one over 25 words (grade 8.6 overall — the
highest in the report, though most of it is legally required wording).

## Proposed structure

Five groups, in the order a reader's questions come:

1. **Score** — the number, the plain line, the caveat split into two
   sentences. One section.
2. **What to fix** — "What people can't use" first, open; "What costs you
   trust" beneath it. The findings are the report; they come second, not
   eighth.
3. **What the law asks** — one section, "Do you meet the legal standard?",
   with the three sub-panels as parts of it (h3s, one rail entry) and the
   plain-text repeat removed: the panels are already text. "Ready for WCAG
   2.2?" as its second sub-part.
4. **For your team** — "For your designer and developer" collapsed to its
   count and first three items, with a "Show all 26" control; the per-kind
   guidance printed once per kind, above the items it applies to, not under
   each. "Notes on the design" and "Screen reader preview" here.
5. **Documents and other views** — statement, conformance report, "through
   other eyes". Already collapsed; stay so.

Expected effect, from the numbers above: the duplicate block removes ~150
words; collapsing the designer section removes ~900 from the first read;
the findings move from ~5,500px to ~1,200px down; the rail goes from
sixteen entries to about nine. Reading grade is unaffected, which is the
point — the sentences were never the problem.

## What not to change
Sentence length and vocabulary (grade 4–6 is where a general audience
reads comfortably); the plain-language glosses beside every standard's
name; the "one fault, one card" rule; the collapsed-by-default documents
at the end. The statement's grade is the law's wording, not ours.
