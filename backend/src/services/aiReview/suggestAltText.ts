import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env, hasAnthropicKey } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/timeout.js";
import type { AccessibilityFinding } from "../../types/report.js";
import { getClaudeClient, CLAUDE_MODEL } from "./claudeClient.js";

// axe rules that fire when an image (or image-role element) is missing a
// text alternative. These are exactly the findings where a concrete,
// looked-at-the-actual-image alt-text suggestion is useful.
const IMAGE_ALT_RULES = new Set([
  "image-alt",
  "input-image-alt",
  "role-img-alt",
  "svg-img-alt",
  "area-alt",
]);

// Vision calls aren't free and each image is one image block — cap how many
// we caption per scan. Findings are pre-sorted by severity upstream, so the
// most important images get captioned first.
const MAX_ALT_SUGGESTIONS = 8;

const ALT_TOOL: Anthropic.Tool = {
  name: "provide_alt_text",
  description:
    "Return suggested alternative text for each numbered image that was shown.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: {
              type: "number",
              description: "The image number this suggestion is for (as labelled in the prompt).",
            },
            decorative: {
              type: "boolean",
              description:
                "True only if the image is purely decorative (adds no information a text reader would miss) and should have empty alt text.",
            },
            altText: {
              type: "string",
              description:
                "Concise, specific alternative text describing the image's content and purpose. Under ~125 characters. No 'image of'/'picture of' prefix. Empty string if decorative is true.",
            },
          },
          required: ["index", "decorative", "altText"],
        },
      },
    },
    required: ["suggestions"],
  },
};

const altResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      index: z.number(),
      decorative: z.boolean(),
      altText: z.string(),
    })
  ),
});

const SYSTEM_PROMPT =
  "You write alternative text (alt text) for website images so people using screen readers get the same information sighted visitors do. " +
  "You will be shown one or more numbered images that currently have no alt text. For each, decide whether it conveys information or is purely decorative, " +
  "and write concise, accurate alt text (under ~125 characters, no redundant 'image of' prefix). If an image is purely decorative, mark it decorative with empty alt text. " +
  "Base the description only on what is actually visible; never invent text, brand names, or details you cannot see.";

/**
 * Mutates image-alt findings in place, attaching a `suggestedAltText` built
 * from the actual captured image. Best-effort and gated: silently no-ops when
 * the AI layer is disabled/keyless, when no image findings have a captured
 * screenshot, or on any API error — an alt-text suggestion is a bonus, never
 * something that can fail or slow down a scan meaningfully.
 */
export async function attachAltTextSuggestions(
  findings: AccessibilityFinding[],
  enabled: boolean
): Promise<void> {
  if (!enabled || !hasAnthropicKey) return;

  const client = getClaudeClient();
  if (!client) return;

  const candidates = findings
    .filter((f) => f.ruleId && IMAGE_ALT_RULES.has(f.ruleId) && f.elementScreenshot)
    .slice(0, MAX_ALT_SUGGESTIONS);
  if (candidates.length === 0) return;

  try {
    await withTimeout(
      captionImages(client, candidates),
      env.AI_ALT_TEXT_TIMEOUT_MS,
      "Alt-text suggestion"
    );
  } catch (err) {
    logger.warn({ err }, "Alt-text suggestion failed — reporting findings without suggestions");
  }
}

async function captionImages(
  client: Anthropic,
  candidates: AccessibilityFinding[]
): Promise<void> {
  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Here are ${candidates.length} image(s) from a web page that are missing alt text. Suggest alt text for each, referring to it by its number.`,
    },
  ];

  candidates.forEach((finding, i) => {
    const snippet = finding.elementSnippet ? ` (HTML: ${finding.elementSnippet.slice(0, 160)})` : "";
    content.push({ type: "text", text: `Image ${i}${snippet}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: finding.elementScreenshot! },
    });
  });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT }],
    tools: [ALT_TOOL],
    tool_choice: { type: "tool", name: ALT_TOOL.name },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );
  if (!toolUse) return;

  const parsed = altResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    logger.warn({ err: parsed.error }, "Alt-text response failed schema validation");
    return;
  }

  for (const suggestion of parsed.data.suggestions) {
    const finding = candidates[suggestion.index];
    if (!finding) continue;
    // Empty string is intentional and meaningful downstream: it tells the
    // widget the image is decorative and should get alt="".
    finding.suggestedAltText = suggestion.decorative ? "" : suggestion.altText.trim();
  }
}
