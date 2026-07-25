import { env, hasAnthropicKey } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { withTimeout, TimeoutError } from "../../utils/timeout.js";
import type { PageReviewContext } from "../contextExtraction/extractContext.js";
import { z } from "zod";
import { aiFindingSchema, type AiFinding, type AiReviewStatus } from "../../types/report.js";

// Only the envelope is validated up front — each finding inside is checked
// individually so one bad entry doesn't cost the whole review.
const aiReviewEnvelopeSchema = z.object({ findings: z.array(z.unknown()) });
import { getClaudeClient, CLAUDE_MODEL } from "./claudeClient.js";
import { SYSTEM_PROMPT, FINDINGS_TOOL } from "./buildPrompt.js";

export interface AiReviewResult {
  status: AiReviewStatus;
  // Why a failed review failed, in coarse terms. "skipped_error" on its own
  // says a headline feature didn't run and gives nobody — us or the reader —
  // any way to tell a passing hiccup from a request this page will never
  // survive. Deliberately a small fixed set rather than the raw message: this
  // is returned over a public API, so it must not carry internals.
  errorKind?: AiReviewErrorKind;
  findings: AiFinding[];
  aiReviewTimeMs: number;
  model: string;
}

export type AiReviewErrorKind =
  // The service was busy or rate-limited. Trying again usually works.
  | "overloaded"
  // The request itself was rejected — too large, or otherwise malformed. Same
  // page will fail the same way until the request changes.
  | "invalid_request"
  // Authentication or billing. Nothing about the page will fix it.
  | "auth"
  // The answer ran past the token budget and was cut off mid-JSON.
  | "truncated"
  // The answer arrived complete but in a shape the schema rejected.
  | "malformed"
  | "unknown";

function classifyReviewError(err: unknown): AiReviewErrorKind {
  const status = (err as { status?: number } | null)?.status;
  if (status === 429 || status === 529 || (typeof status === "number" && status >= 500)) {
    return "overloaded";
  }
  if (status === 401 || status === 403) return "auth";
  if (typeof status === "number" && status >= 400) return "invalid_request";

  const message = err instanceof Error ? err.message : "";
  if (/max_tokens/i.test(message)) return "truncated";
  if (/schema validation|tool_use block/i.test(message)) return "malformed";
  return "unknown";
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
    // 4096 truncated the findings list mid-JSON on content-rich pages, which
    // surfaced as a confusing "expected array, received string" schema error
    // rather than an obvious truncation. Paired with the cap on findings in
    // the system prompt, this leaves comfortable headroom.
    max_tokens: 8192,
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

  // Say so plainly when the response was cut short. Truncated tool input
  // arrives as an unparseable partial string, which otherwise shows up as a
  // baffling "expected array, received string" — the symptom, not the cause.
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "Claude response hit the max_tokens limit — the findings list was truncated mid-JSON"
    );
  }

  const normalized = normalizeToolInput(toolUse.input);

  // Validate the envelope strictly, but each finding independently: one
  // malformed entry used to discard the entire review, so a single missing
  // field cost all the other findings the model got right. Keep what's valid
  // and note what wasn't.
  const envelope = aiReviewEnvelopeSchema.safeParse(normalized);
  if (!envelope.success) {
    // Include a short prefix of what actually arrived. Without it the message
    // describes the symptom ("expected array, received string") and gives no
    // way to tell which malformation produced it.
    throw new Error(
      `Claude response failed schema validation: ${envelope.error.message} — received: ${describeToolInput(toolUse.input)}`
    );
  }

  const findings: AiFinding[] = [];
  const rejected: string[] = [];
  for (const candidate of envelope.data.findings) {
    const one = aiFindingSchema.safeParse(candidate);
    if (one.success) findings.push(one.data);
    else rejected.push(one.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  if (rejected.length > 0) {
    logger.warn(
      { rejected: rejected.slice(0, 5), rejectedCount: rejected.length, kept: findings.length },
      "Dropped malformed AI findings, keeping the rest"
    );
  }

  return findings;
}

/**
 * The model occasionally returns the `findings` array as a JSON *string*
 * rather than a real array — valid-looking tool use that fails schema
 * validation, which cost roughly two thirds of live review attempts before
 * this. The content is correct; only the encoding differs, so parse it rather
 * than discarding a completed (and paid-for) response.
 *
 * Exported for testing. Anything it can't repair is returned untouched, so the
 * schema check still rejects genuinely malformed input.
 */
// A short, safe description of malformed tool input for the error log — the
// shape and a prefix, never the whole payload.
function describeToolInput(input: unknown): string {
  if (typeof input !== "object" || input === null) return `${typeof input}`;
  const findings = (input as Record<string, unknown>).findings;
  if (typeof findings !== "string") return `findings is ${typeof findings}`;
  return `findings is a ${findings.length}-char string starting ${JSON.stringify(findings.slice(0, 220))}`;
}

export function normalizeToolInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const record = input as Record<string, unknown>;
  if (typeof record.findings !== "string") return input;

  const text = record.findings.trim();
  try {
    const decoded = JSON.parse(text);
    if (!Array.isArray(decoded)) return input;
    return { ...record, findings: decoded };
  } catch {
    // The whole string wouldn't parse, so salvage the findings that would.
    // Measured live: this was ~40% of review attempts on a content-rich page,
    // and every one of them threw away a complete, paid-for response over a
    // single bad character somewhere in a 5,000-character string.
    const salvaged = salvageJsonObjects(text);
    if (salvaged.length === 0) return input;
    logger.warn(
      { salvaged: salvaged.length, chars: text.length },
      "findings string wouldn't parse — recovered the well-formed entries"
    );
    return { ...record, findings: salvaged };
  }
}

/**
 * Pulls every top-level {...} out of a string and parses each one on its own,
 * keeping the ones that work.
 *
 * Deliberately per-object rather than one parse of the whole text: the two
 * ways this input goes wrong are a tail cut off mid-object and one entry with
 * a stray character in its prose, and both cost the entire review under an
 * all-or-nothing parse. Recovering eight of nine findings is worth far more
 * than reporting none.
 *
 * Tracks string state so a brace inside a description — "click the {more}
 * button" — doesn't throw the depth count off.
 *
 * Exported for testing.
 */
export function salvageJsonObjects(text: string): unknown[] {
  const found: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          try {
            found.push(JSON.parse(text.slice(start, i + 1)));
          } catch {
            // One unsalvageable entry shouldn't cost the others.
          }
          start = -1;
        }
      }
    }
  }
  return found;
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
    return {
      status,
      errorKind: classifyReviewError(err),
      findings: [],
      aiReviewTimeMs: Date.now() - start,
      model: CLAUDE_MODEL,
    };
  }
}
