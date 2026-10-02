import type { FastifyInstance } from "fastify";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getClaudeClient } from "../services/aiReview/claudeClient.js";
import { CHAT_SYSTEM_PROMPT, START_SCAN_TOOL } from "../services/chat/chatPrompt.js";

/**
 * The conversational front of the checker, as server-sent events.
 *
 * The widget owns the conversation and sends it whole on every turn; this
 * route holds nothing between requests. Assistant turns go back to the
 * widget as the exact content blocks the API returned, thinking blocks and
 * all, and come back unedited on the next turn. The history is append-only
 * for that reason: the API ties thinking blocks to the conversation that
 * produced them, and an edited earlier turn invalidates them.
 *
 * The scan itself is not run here. When the model calls start_scan, the
 * request ends with that call; the widget runs the scan the way the form
 * always has — narration, history, report — and sends the result back as
 * the tool result in the next request.
 */

// Opus 5.5 for the conversation. The page review keeps its own constant;
// these are different jobs with different budgets.
const CHAT_MODEL = "claude-opus-5-5";

// Bounds on what a caller may send. The endpoint spends this server's API
// key on every request, so the caps are about cost as much as validity: a
// conversation about one scan does not need sixty turns or a novel per
// message, and the report digest the widget attaches is well under the
// total.
const MAX_MESSAGES = 60;
const MAX_USER_TEXT = 4_000;
const MAX_BODY_CHARS = 400_000;

const textOrBlocks = z.union([z.string().max(MAX_BODY_CHARS), z.array(z.record(z.string(), z.unknown())).max(50)]);

const chatBodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: textOrBlocks }))
    .min(1)
    .max(MAX_MESSAGES),
});

const scanInputSchema = z.object({
  url: z.string().min(1).max(2_000),
  scope: z.enum(["page", "site"]),
  ai_review: z.boolean(),
});

function userTextTooLong(messages: z.infer<typeof chatBodySchema>["messages"]): boolean {
  for (const m of messages) {
    if (m.role !== "user") continue;
    if (typeof m.content === "string" && m.content.length > MAX_USER_TEXT) return true;
  }
  return false;
}

export async function chatRoutes(app: FastifyInstance) {
  app.post("/api/chat", async (request, reply) => {
    const raw = JSON.stringify(request.body ?? {});
    if (raw.length > MAX_BODY_CHARS) {
      return reply.status(413).send({ error: "The conversation is too long to continue. Start a new one." });
    }
    const parsed = chatBodySchema.safeParse(request.body);
    if (!parsed.success || userTextTooLong(parsed.data.messages)) {
      return reply.status(400).send({ error: "Invalid conversation" });
    }
    const last = parsed.data.messages[parsed.data.messages.length - 1];
    if (last.role !== "user") {
      return reply.status(400).send({ error: "The conversation must end with the person's turn." });
    }

    const client = getClaudeClient();
    if (!client) {
      // Not a failure of the request: the widget falls back to scanning the
      // address it was given, and says so.
      return reply.status(503).send({ error: "chat_unavailable" });
    }

    // Hijacked, like the progress stream: the cors plugin's hook does not
    // run on a hijacked reply, so the header is set here.
    const origin = request.headers.origin;
    const allowOrigin =
      env.ALLOWED_ORIGINS === "*"
        ? "*"
        : origin && env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).includes(origin)
          ? origin
          : null;

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    });
    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const stream = client.beta.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 16_000,
      // Opus 5.5 always thinks; effort is the control, and its default is
      // medium. Stated rather than inherited, so a change of default does
      // not quietly change what this costs.
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: CHAT_SYSTEM_PROMPT }],
      tools: [START_SCAN_TOOL],
      // Caches the growing conversation, report digest included, so a
      // follow-up question re-reads the report from cache.
      cache_control: { type: "ephemeral" },
      messages: parsed.data.messages as Anthropic.Beta.BetaMessageParam[],
      // A refusal on the primary model is retried on the fallback rather
      // than ending the person's turn.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
    });

    request.raw.on("close", () => stream.abort());

    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          send("delta", { text: event.delta.text });
        }
      }
      const final = await stream.finalMessage();

      if (final.stop_reason === "refusal") {
        send("done", {
          content: [{ type: "text", text: "I cannot help with that here. I can check a page or answer questions about its report." }],
          stopReason: "refusal",
          scan: null,
        });
        res.end();
        return;
      }

      let scan: { toolUseId: string; url: string; scope: "page" | "site"; aiReview: boolean } | null = null;
      for (const block of final.content) {
        if (block.type === "tool_use" && block.name === "start_scan") {
          // Streamed input is not validated by the API; it is checked here
          // before the widget is told to act on it.
          const input = scanInputSchema.safeParse(block.input);
          if (input.success) {
            scan = {
              toolUseId: block.id,
              url: input.data.url,
              scope: input.data.scope,
              aiReview: input.data.ai_review,
            };
          }
        }
      }

      send("done", { content: final.content, stopReason: final.stop_reason, scan });
      res.end();
    } catch (err) {
      if (stream.aborted) return;
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Chat turn failed");
      send("error", { error: "The assistant stopped responding. Try sending that again." });
      res.end();
    }
  });
}
