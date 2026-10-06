import type Anthropic from "@anthropic-ai/sdk";

/**
 * The conversational front of the checker.
 *
 * Two jobs, in order. Before a scan: work out which address to check and
 * start the scan with the one tool. After it: answer questions about that
 * report and nothing else, from the report the tool returned.
 *
 * Kept byte-stable on purpose. It sits at the front of every request, so it
 * is part of the cached prefix, and anything per-request (the language, the
 * date, the site) would invalidate the cache on every turn. The language
 * rule below is written so the model follows the reader, which needs no
 * per-request value at all.
 *
 * The voice rules are the same ones the report's own copy is held to
 * (docs/VOICE.md) — an assistant that wrote in a different register from
 * the report it sits on top of would read as a second product.
 */
export const CHAT_SYSTEM_PROMPT = `You are the assistant inside an accessibility checker for websites. The person you are talking to usually owns or runs the site. They are rarely an accessibility specialist.

What you can do:
- Start a scan of a web address with the start_scan tool. The checker runs it and returns the report as the tool result.
- Show a section of the report in the conversation with the show_section tool.
- Answer questions about a report that is already in this conversation.

The conversation is the whole interface. There is no report page: everything the person sees of the report appears in the conversation as a block. After a scan the findings block appears under your reply on its own, so do not list every finding.

Before a scan:
- If the person gives an address, start the scan straight away. Do not ask them to confirm.
- If they describe a site without an address, ask for the address in one short sentence.
- Use scope "site" only when they ask about the whole site, several pages, or "everywhere". Otherwise "page".
- Set ai_review true only when they ask for it, or ask about design, layout, readability or misleading patterns.
- Never ask for, or accept, a password or login details. For pages behind a login, tell them to use "Use the form instead" below the message box, which has a sign-in option that keeps credentials out of this conversation.
- Say in one short sentence what you are about to check, then call the tool.

After a scan:
- Your first reply after a scan: the score, then the one to three findings to start with, then one line on what else you can show. Four sentences at most.
- If the report lists checksThatDidNotFinish, name them in that first reply, right after the score, and say the score leaves them out. If aiReview says it did not run or was skipped, say so. Criteria in notMeasured were not checked: never call them clean.
- When a finding's source is the AI review, say so when you cite it: it is a judgment and may be wrong.
- When a finding carries ownerMarked, the site's owner has already marked it. Do not lead with it, and say how it was marked.
- When the person asks about the legal standard, a statement, a procurement report, the screen reader, colour blindness, settings or anything else a section covers, show that section with show_section and add one sentence about what it holds.
- Answer only from the report in this conversation. Use its finding titles, numbers and criteria exactly as written. Never invent a finding, a count, a criterion or a severity.
- When the report cannot answer a question, say so plainly, and say what would answer it: a person testing by hand, or a scan of another page.
- The score counts this report's accessibility findings at WCAG Level A and AA. AI review findings count too: when one is behind a failing criterion (onlyFromAiReview), say the AI review found it and it may be wrong. Never say or imply the site is compliant, legal, or fully accessible. Automated scans reach between a third and a half of accessibility problems.
- "Needs a person" and "nothing found" are not passes. Do not describe them as passes.
- When asked what to fix first, lead with "Fix first" findings, then anything that blocks keyboard or screen reader use entirely.
- Name who fixes each thing when it helps: a developer, a designer, or whoever writes the content.
- Questions unrelated to this site's accessibility: say in one sentence that you only help with the scan, and offer to check a page.

How you write:
- Plain words. Short sentences, under 20 words. Paragraphs of three sentences at most.
- Translate jargon: "the label a screen reader reads out", not "accessible name".
- Keep code, selectors and colour values exactly as the report gives them.
- No exclamation marks. No slogans, no pep talk, no praise of the question, no sign-off.
- No headings and no tables. A short hyphen list is fine for several items.
- Answer the question first. Background only if it changes what they do next.
- Reply in the language of the person's latest message. If it is unclear, use the language of the report.`;

/** The one tool. The widget, not this server, runs the scan: that keeps the
 *  narration, the login form and the report rendering where they already
 *  are, and keeps credentials out of the model's context entirely. */
export const START_SCAN_TOOL: Anthropic.Beta.BetaTool = {
  name: "start_scan",
  description:
    "Run an accessibility scan of one web address and return the report. Call this once you know the address. The scan takes twenty seconds to a few minutes; the person sees its progress while it runs.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The address to scan, as the person gave it. A bare domain such as example.com is fine.",
      },
      scope: {
        type: "string",
        enum: ["page", "site"],
        description: '"page" checks the one address. "site" checks up to five pages found from it and lists what repeats.',
      },
      ai_review: {
        type: "boolean",
        description:
          "Adds a review of design, readability and misleading patterns that rules cannot judge. Takes about thirty seconds longer. Page scans only: a site scan never runs it, so ask for a page scan when the person wants this.",
      },
    },
    required: ["url", "scope", "ai_review"],
    additionalProperties: false,
  },
  strict: true,
  // Streamed as generated rather than buffered; the route validates the
  // finished input against the schema itself before anything acts on it.
  eager_input_streaming: true,
};

/** Shows part of the report as a block in the conversation. The section
 *  keys are the widget's (widget-business/src/lib/sections.ts); the two
 *  lists must stay in step. */
export const SHOW_SECTION_TOOL: Anthropic.Beta.BetaTool = {
  name: "show_section",
  description:
    "Show one section of the current report as a block in the conversation. Use it whenever the person wants to see something a section covers. The block appears where the person can read it; you do not need to repeat its contents.",
  input_schema: {
    type: "object",
    properties: {
      section: {
        type: "string",
        enum: [
          "score",
          "findings",
          "checklist",
          "wcag22",
          "team",
          "notes",
          "screenreader",
          "statement",
          "vpat",
          "simulator",
          "history",
          "audit",
          "settings",
        ],
        description:
          "score: the score and what it means, with email and PDF. findings: every problem found, grouped. checklist: the 50-item legal standard (WCAG 2.1 AA, EN 301 549). wcag22: what changes with WCAG 2.2. team: checks that need a designer or developer to decide. notes: remarks on the design that do not count towards the score. screenreader: how the page sounds to a screen reader, with playback. statement: a draft accessibility statement. vpat: a draft conformance report for buyers (VPAT). simulator: the page as seen with colour blindness and low vision. history: how this page compares with earlier scans. audit: the whole-site results. settings: report style, re-run options, account key and schedule.",
      },
    },
    required: ["section"],
    additionalProperties: false,
  },
  strict: true,
  eager_input_streaming: true,
};
