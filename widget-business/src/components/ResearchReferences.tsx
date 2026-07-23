// A standing reference library shown inside the checker — the research the
// readability/typography checks are grounded in. Content curated by the site
// owner; the Microsoft citations were verified against Microsoft's own
// published sources.

interface Ref {
  title: string;
  source: string;
  body: string[];
  links: Array<{ label: string; url: string }>;
}

const REFERENCES: Ref[] = [
  {
    title: "Readability vs. accessibility — what actually makes type work",
    source: "Typotheque",
    body: [
      "They get used interchangeably, but they aren't the same. Readability is about ease of reading at speed — flow. Accessibility is about whether a wider range of people can read the text at all — access. A typeface can be highly readable yet still inaccessible if it leans on fine visual distinctions or low contrast; an accessible type system can feel slightly less elegant in ideal conditions but holds up across environments, devices, and abilities.",
      "Readability starts in the letterforms — open counters, generous x-heights, balanced stroke contrast, clear differentiation between similar characters (I, l, 1) — but doesn't end there. How the font is set matters just as much: line length, leading, justification, and hyphenation shape how comfortably text reads over a passage. It's good type design and thoughtful typesetting working together.",
      "Accessibility expands who can use the type — whether someone with low vision, dyslexia, colour blindness, or a screen reader can engage at all. That's where contrast, font-weight flexibility, responsive scaling, semantic structure, and assistive-tech compatibility come in. Less about the letterforms themselves, more about system design.",
      "The overlap is the goal: readability supports ease, accessibility guarantees inclusion. The challenge isn't choosing one over the other — it's understanding how spacing, form, and structure affect real-world use.",
    ],
    links: [{ label: "Typotheque — type & accessibility", url: "https://www.typotheque.com/" }],
  },
  {
    title: "Microsoft: how we actually recognise words",
    source: "Kevin Larson, Microsoft Advanced Reading Technology (2004)",
    body: [
      "“The Science of Word Recognition” argues against the popular “word shape” (bouma) model — the idea that we read by a word's overall outline. The evidence supports parallel letter recognition: we identify a word's letters simultaneously, and that letter information drives recognition (the Word Superiority Effect shows letters are easier to identify inside a word than alone).",
      "The design implication is direct: individual letter legibility and clear differentiation between similar shapes (I / l / 1, rn / m) genuinely matter — you can't rely on word silhouette to carry recognition. This is exactly why the checker flags things that blur letters together or strip out their shapes (tight tracking, long all-caps).",
    ],
    links: [
      { label: "The Science of Word Recognition (Microsoft)", url: "https://learn.microsoft.com/en-us/typography/develop/word-recognition" },
    ],
  },
  {
    title: "Microsoft & MIT: good typography changes how readers feel",
    source: "Kevin Larson (Microsoft) & Rosalind Picard (MIT)",
    body: [
      "In “The Aesthetics of Reading,” participants read the same content in good or poor typography. Raw reading speed and comprehension didn't differ much — but readers of the well-set version were in a better mood and did better on a creative problem-solving task afterward (and frowned less, measured via the corrugator muscle).",
      "The takeaway: good typography's payoff isn't only faster reading — it improves the reader's emotional and cognitive state. Quality of setting has real value even when reading speed looks unchanged.",
    ],
    links: [
      {
        label: "Measuring the Aesthetics of Reading (Microsoft Research)",
        url: "https://www.microsoft.com/en-us/research/wp-content/uploads/2021/06/Larson-Hazlett-Chaparro-Picard-2006-measuring-the-aesthetics-of-reading.pdf",
      },
    ],
  },
  {
    title: "Notes & further reading",
    source: "Ongoing",
    body: [
      "Type-and-accessibility research is still an open field. There's broad agreement on many best practices, but how specific typeface features affect readers with particular conditions — dyslexia especially — remains under active study (e.g. the debate over OpenDyslexic vs. plain sans-serifs, and Adobe/Brown's work showing different fonts speed up reading for different individuals).",
      "The foundational access requirements are settled, though: sufficient contrast and text that can be resized. Those are checked here and specified in WCAG.",
    ],
    links: [
      { label: "WCAG — contrast minimum", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html" },
      { label: "WCAG — resize text", url: "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html" },
    ],
  },
];

export function ResearchReferences() {
  return (
    <details className="a11y-references">
      <summary className="a11y-references-summary">
        Type, readability &amp; accessibility — the research behind these checks
      </summary>
      <div className="a11y-references-body">
        {REFERENCES.map((ref) => (
          <article className="a11y-reference" key={ref.title}>
            <h4 className="a11y-reference-title">{ref.title}</h4>
            <p className="a11y-reference-source">{ref.source}</p>
            {ref.body.map((para, i) => (
              <p className="a11y-reference-para" key={i}>
                {para}
              </p>
            ))}
            <p className="a11y-reference-links">
              {ref.links.map((l) => (
                <a
                  className="a11y-learn-more"
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label} ↗
                </a>
              ))}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}
