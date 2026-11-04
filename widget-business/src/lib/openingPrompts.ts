/**
 * The questions an empty conversation opens with (user's list, 4 Nov 2026),
 * in the reader's own voice: picking one sends it exactly as if it had
 * been typed. Three groups; each load shows one from each, set in a
 * different layout, so the opening is never the same twice.
 *
 * Keys are the English strings, as everywhere in lib/strings; the
 * translations sit in strings.{de,es,fr}.ts and the keys are listed in
 * CHROME_KEYS through OPENING_PROMPT_KEYS below.
 */

export type PromptGroup = { label: string; prompts: string[] };

export const OPENING_PROMPTS: PromptGroup[] = [
  {
    label: "Ask about this page",
    prompts: [
      "How would a screen reader announce this button? Tell me what you can inspect and what I should test with a screen reader.",
      "Which images on this page need alt text, and what should it say in context?",
      "Is this link clear if someone hears its text on its own? Suggest clearer wording if needed.",
      "Can someone understand this error message without relying on colour? Rewrite it so they know what to do next.",
      "What accessibility issues might an automated scan miss on this page? Give me a short manual test plan.",
    ],
  },
  {
    label: "Quick checks",
    prompts: [
      "Can someone use a website without a mouse?",
      "Can someone close a cookie banner with a keyboard?",
      "Is the text easy to read against its background?",
      "Can someone zoom in without losing access to content?",
      "Can someone fill out a form with a screen reader?",
      "Can someone complete checkout using only a keyboard?",
      "Do the images have useful alt text?",
      "Are the videos accessible without sound?",
      "Does a menu or pop-up work with a keyboard?",
      "Can someone tell which field has an error and how to fix it?",
    ],
  },
  {
    label: "Help me",
    prompts: [
      "Explain an accessibility warning in plain language",
      "Help me decide which accessibility issues to fix first",
      "Show me how to reproduce an issue",
      "Review a snippet of HTML for accessibility",
      "Turn an accessibility finding into a developer ticket",
      "Help me verify that a fix works",
    ],
  },
];

/** The type each panel can be set in, after the specimens on a font
 *  tester: one size, weight, leading and tracking each. Sizes stay literal
 *  and inside the type rules: Light only at 40px and up, Regular and Medium
 *  anywhere; the phone sizes are what each steps down to under 640px. */
export const PROMPT_LAYOUTS = ["display", "bold", "text"] as const;
export type PromptLayout = (typeof PROMPT_LAYOUTS)[number];

export const OPENING_PROMPT_KEYS: string[] = [
  ...OPENING_PROMPTS.map((g) => g.label),
  ...OPENING_PROMPTS.flatMap((g) => g.prompts),
  "Other questions",
  "Questions to start with",
];

export type PromptPick = { group: string; prompt: string; layout: PromptLayout };

/** One prompt from each group, each in a different layout, shuffled. A
 *  `random` stand-in keeps it testable; `avoid` is the last pick, so a
 *  shuffle always changes every panel it can. */
export function pickOpeningPrompts(random: () => number = Math.random, avoid: PromptPick[] = []): PromptPick[] {
  const layouts = shuffle([...PROMPT_LAYOUTS], random);
  return OPENING_PROMPTS.map((g, i) => {
    const last = avoid.find((p) => p.group === g.label)?.prompt;
    const pool = g.prompts.length > 1 && last ? g.prompts.filter((p) => p !== last) : g.prompts;
    return { group: g.label, prompt: pool[Math.floor(random() * pool.length)], layout: layouts[i % layouts.length] };
  });
}

function shuffle<T>(list: T[], random: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
