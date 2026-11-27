import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env, hasAnthropicKey } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/timeout.js";
import type { AccessibilityFinding, Severity } from "../../types/report.js";
import type { ReportLang } from "../conformance/criteriaText.js";
import { getClaudeClient, CLAUDE_MODEL } from "./claudeClient.js";

/**
 * The AI fix: a corrected version of the failing element's own markup.
 *
 * Every finding already says what is wrong and, in words, what to do. What the
 * person who has to fix it actually wants is the element, fixed. The model is
 * shown the captured snippet (classes and inline styles already stripped by the
 * render pass), the rule that failed and the report's own fix sentence, and
 * returns the same element with the fault corrected.
 *
 * What it is NOT allowed to do is decided here, in code, not only in the
 * prompt:
 *  - it sees markup only, never the stylesheet, so a fix that needs CSS it
 *    cannot see is declined (canFix: false) rather than guessed;
 *  - words it cannot know (a link's destination, a field's purpose) go in as
 *    a bracketed placeholder the owner fills in, never as an invention;
 *  - an answer identical to the input, empty, or far longer than the input is
 *    dropped (validateCodeFix).
 *
 * It runs beside the page review, on the measured findings only, so it adds
 * no wall-clock time to a scan the review is already waiting on. Best-effort
 * like the alt-text layer: no key, a timeout or an API error costs the fixes
 * and nothing else.
 */

// Image findings get a suggestion written from the picture itself
// (suggestAltText.ts); a second, markup-only guess beside it would be worse
// and would contradict it.
const SKIP_RULES = new Set(["image-alt", "input-image-alt", "role-img-alt", "svg-img-alt", "area-alt"]);

// One request, a dozen elements. Measured cost scales with the snippets, not
// the count, and the snippets are capped below; twelve covers every distinct
// rule on the large majority of pages while keeping the answer well inside
// the token budget.
export const MAX_CODE_FIXES = 12;
// A snippet longer than this is a container, not an element; a fix of it
// would be a rewrite of the page section, which is not what this is for.
const MAX_SNIPPET_CHARS = 1_200;
// The corrected element may add attributes and a label; it may not grow into
// something else.
const MAX_GROWTH_CHARS = 600;
const MAX_NOTE_CHARS = 220;

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

const LANG_NAME: Record<ReportLang, string> = { en: "English", de: "German", es: "Spanish", fr: "French" };

export interface CodeFix {
  before: string;
  after: string;
  note?: string;
  model: string;
}

/** The key a fix is held under between the request and the final list: the
 *  finding objects are copied and re-ordered by the merge, the rule and the
 *  element are not. */
export function codeFixKey(f: Pick<AccessibilityFinding, "ruleId" | "selector">): string {
  return `${f.ruleId ?? ""}|${f.selector}`;
}

/**
 * Which findings get a fix. Measured findings with a snippet, worst first,
 * one per rule before a second of any rule: twelve fixes for twelve link
 * names would teach the owner one thing twelve times.
 */
export function pickCodeFixCandidates(findings: AccessibilityFinding[]): AccessibilityFinding[] {
  const eligible = findings
    .filter(
      (f) =>
        f.source === "automated" &&
        f.category === "accessibility" &&
        f.elementSnippet &&
        f.elementSnippet.trim().length > 0 &&
        f.elementSnippet.length <= MAX_SNIPPET_CHARS &&
        !(f.ruleId && SKIP_RULES.has(f.ruleId))
    )
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const seenKeys = new Set<string>();
  const seenRules = new Set<string>();
  const first: AccessibilityFinding[] = [];
  const rest: AccessibilityFinding[] = [];
  for (const f of eligible) {
    const key = codeFixKey(f);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const rule = f.ruleId ?? f.id;
    if (seenRules.has(rule)) rest.push(f);
    else {
      seenRules.add(rule);
      first.push(f);
    }
  }
  return [...first, ...rest].slice(0, MAX_CODE_FIXES);
}

const normalize = (s: string) => s.replace(/\s+/g, " ").replace(/\s*(\/?>)/g, "$1").trim();

/**
 * The deterministic gate on one answer. Returns the fix to attach, or null.
 * Exported for the tests: this is the part that must hold whatever the model
 * writes.
 */
export function validateCodeFix(
  before: string,
  raw: { canFix: boolean; fixedHtml?: string; note?: string },
  model: string
): CodeFix | null {
  if (!raw.canFix) return null;
  const after = (raw.fixedHtml ?? "").trim();
  if (!after) return null;
  if (!after.startsWith("<")) return null;
  if (after.length > before.length + MAX_GROWTH_CHARS) return null;
  if (normalize(after) === normalize(before)) return null;
  // Script and event handlers are never part of an accessibility fix, and a
  // copy button hands this text straight to someone's codebase.
  if (/<script\b|\son[a-z]+\s*=|javascript:/i.test(after) && !/<script\b|\son[a-z]+\s*=|javascript:/i.test(before)) {
    return null;
  }
  const note = raw.note?.trim().replace(/\s*[—]\s*/g, " – ");
  return {
    before,
    after,
    ...(note ? { note: note.length > MAX_NOTE_CHARS ? `${note.slice(0, MAX_NOTE_CHARS - 1).trimEnd()}…` : note } : {}),
    model,
  };
}

/** Attaches fixes to the final findings by rule and selector. Pure. */
export function attachCodeFixes(findings: AccessibilityFinding[], fixes: Map<string, CodeFix>): number {
  let attached = 0;
  for (const f of findings) {
    const fix = fixes.get(codeFixKey(f));
    if (fix && f.elementSnippet && normalize(f.elementSnippet) === normalize(fix.before)) {
      f.suggestedCode = fix;
      attached += 1;
    }
  }
  return attached;
}

const FIX_TOOL: Anthropic.Tool = {
  name: "provide_code_fixes",
  description: "Return a corrected version of each numbered HTML element.",
  input_schema: {
    type: "object",
    properties: {
      fixes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The element number, as labelled in the prompt." },
            canFix: {
              type: "boolean",
              description:
                "False when the fault cannot be corrected in this element's markup alone (it needs CSS you cannot see, JavaScript, or a change elsewhere on the page).",
            },
            fixedHtml: {
              type: "string",
              description:
                "The same element with the fault corrected. Keep every tag, attribute and text that is not part of the fault exactly as given. Empty when canFix is false.",
            },
            note: {
              type: "string",
              description:
                "One sentence, under 25 words, saying what changed or what the owner must fill in. In the requested language.",
            },
          },
          required: ["index", "canFix", "fixedHtml", "note"],
        },
      },
    },
    required: ["fixes"],
  },
};

const fixResponseSchema = z.object({
  fixes: z.array(
    z.object({
      index: z.number(),
      canFix: z.boolean(),
      fixedHtml: z.string().optional(),
      note: z.string().optional(),
    })
  ),
});

function systemPrompt(lang: ReportLang): string {
  return (
    "You correct accessibility faults in HTML elements taken from a live web page. " +
    "Each element comes with the WCAG rule it fails and the fix the report recommends. Return the same element with only that fault corrected. " +
    "Rules: change as little as possible and keep everything else exactly as given. " +
    "You see the element's markup only, never its stylesheet: classes and inline styles were stripped. If the fault can only be fixed in CSS, JavaScript or elsewhere on the page, set canFix to false. " +
    "Never invent facts. When the right words depend on something you cannot see (where a link goes, what a field is for, what a button does), put a short bracketed placeholder such as [what this button does] for the owner to fill in. " +
    "Prefer native HTML over ARIA. Never add script, event handlers or javascript: URLs. " +
    `Write each note in ${LANG_NAME[lang]}, one plain sentence, no dashes as punctuation.`
  );
}

/**
 * Asks for fixes for the given candidates. Resolves to a map by codeFixKey,
 * empty when the layer is off or anything fails. Never rejects.
 */
export async function suggestCodeFixes(
  candidates: AccessibilityFinding[],
  enabled: boolean,
  lang: ReportLang
): Promise<Map<string, CodeFix>> {
  const out = new Map<string, CodeFix>();
  if (!enabled || !hasAnthropicKey || candidates.length === 0) return out;
  const client = getClaudeClient();
  if (!client) return out;

  try {
    await withTimeout(requestFixes(client, candidates, lang, out), env.AI_CODE_FIX_TIMEOUT_MS, "Code fix suggestion");
  } catch (err) {
    logger.warn({ err }, "Code fix suggestion failed. Reporting findings without AI fixes");
    out.clear();
  }
  return out;
}

async function requestFixes(
  client: Anthropic,
  candidates: AccessibilityFinding[],
  lang: ReportLang,
  out: Map<string, CodeFix>
): Promise<void> {
  const blocks = candidates.map((f, i) => {
    const lines = [
      `Element ${i}`,
      `Rule: ${f.ruleId ?? "unknown"}${f.wcagCriterion ? ` (WCAG ${f.wcagCriterion})` : ""}`,
      `Problem: ${f.description.slice(0, 300)}`,
      `Recommended fix: ${f.suggestedFix.slice(0, 300)}`,
    ];
    if (f.suggestedColour) {
      lines.push(
        `A passing colour was measured: ${f.suggestedColour.from} to ${f.suggestedColour.to} on ${f.suggestedColour.background}. Colour lives in CSS, so only fix this in markup if the element carries the colour itself.`
      );
    }
    lines.push("HTML:", f.elementSnippet!);
    return lines.join("\n");
  });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: [{ type: "text", text: systemPrompt(lang) }],
    tools: [FIX_TOOL],
    tool_choice: { type: "tool", name: FIX_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Here are ${candidates.length} element(s) that fail an accessibility check. Correct each one.\n\n${blocks.join("\n\n---\n\n")}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );
  if (!toolUse) return;
  const parsed = fixResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    logger.warn({ err: parsed.error }, "Code fix response failed schema validation");
    return;
  }

  let declined = 0;
  for (const raw of parsed.data.fixes) {
    const finding = candidates[raw.index];
    if (!finding) continue;
    const fix = validateCodeFix(finding.elementSnippet!, raw, CLAUDE_MODEL);
    if (fix) out.set(codeFixKey(finding), fix);
    else declined += 1;
  }
  logger.info({ asked: candidates.length, accepted: out.size, declined }, "code fixes");
}
