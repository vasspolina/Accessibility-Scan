import { env, hasAnthropicKey } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { withTimeout, TimeoutError } from "../../utils/timeout.js";
import type { PageReviewContext } from "../contextExtraction/extractContext.js";
import { aiReviewResponseSchema, type AiFinding, type AiReviewStatus } from "../../types/report.js";
import { getClaudeClient, CLAUDE_MODEL } from "./claudeClient.js";
import { SYSTEM_PROMPT, FINDINGS_TOOL } from "./buildPrompt.js";

export interface AiReviewResult {
  status: AiReviewStatus;
  findings: AiFinding[];
  aiReviewTimeMs: number;
  model: string;
}

async function callClaude(context: PageReviewContext, screenshotBase64: string): Promise<AiFinding[]> {
  const client = getClaudeClient();
  if (!client) throw new Error("Claude client unavailable");

  // Image before text, per Anthropic's guidance for multi-block vision
  // messages — grounds the structured JSON that follows in what the page
  // actually looks like, which matters for design-clarity/dark-pattern
  // findings that a DOM summary alone can't judge.
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [FINDINGS_TOOL],
    tool_choice: { type: "tool", name: FINDINGS_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: screenshotBase64 },
          },
          {
            type: "text",
            text:
              "Screenshot of the page's current viewport is above. Structured DOM/accessibility context follows:\n\n" +
              JSON.stringify(context),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new Error("Claude response did not include a tool_use block");
  }

  const parsed = aiReviewResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Claude response failed schema validation: ${parsed.error.message}`);
  }

  return parsed.data.findings;
}

export async function reviewPage(
  context: PageReviewContext,
  screenshotBase64: string,
  enabled: boolean
): Promise<AiReviewResult> {
  const start = Date.now();

  if (!enabled) {
    return { status: "disabled_by_request", findings: [], aiReviewTimeMs: 0, model: CLAUDE_MODEL };
  }

  if (!hasAnthropicKey) {
    return { status: "skipped_no_key", findings: [], aiReviewTimeMs: 0, model: CLAUDE_MODEL };
  }

  try {
    const findings = await withTimeout(
      callClaude(context, screenshotBase64),
      env.AI_REVIEW_TIMEOUT_MS,
      "AI review"
    );
    return { status: "completed", findings, aiReviewTimeMs: Date.now() - start, model: CLAUDE_MODEL };
  } catch (err) {
    const status: AiReviewStatus = err instanceof TimeoutError ? "skipped_timeout" : "skipped_error";
    logger.warn({ err, status }, "AI review layer failed — degrading to automated-only report");
    return { status, findings: [], aiReviewTimeMs: Date.now() - start, model: CLAUDE_MODEL };
  }
}
