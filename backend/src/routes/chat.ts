import type { FastifyInstance } from "fastify";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getClaudeClient } from "../services/aiReview/claudeClient.js";
import { CHAT_SYSTEM_PROMPT, SHOW_SECTION_TOOL, START_SCAN_TOOL, WEB_SEARCH_TOOL } from "../services/chat/chatPrompt.js";

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
 *
 * Web search is the other way round: it runs on the API's side, inside the
 * same response, and the route only tells the widget that a search is on
 * and what it asked, so the wait has a name.
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

// Web searches run in a loop on the API's side, and a long one is handed
// back as pause_turn with the work so far. The route resumes it, up to this
// many times, so the person sees one answer and not a half-finished one;
// the turn that is still paused after that goes to the widget as it is.
const MAX_PAUSE_RESUMES = 3;

/** The query of a web_search call, read out of its streamed input. The
 *  input arrives in pieces and may be cut short; a query that does not
 *  parse is simply not shown. */
function searchQuery(partialJson: string): string | null {
  try {
    const input = JSON.parse(partialJson) as { query?: unknown };
    return typeof input.query === "string" && input.query.trim() ? input.query.trim() : null;
  } catch {
    return null;
  }
}

// What a person's turn may hold: what the widget sends, and nothing else —
// typed text, the report digest as text, and string tool results. No image,
// document or search_result blocks and no URL sources: a request of a few
// kilobytes could otherwise have the API fetch and bill a long PDF. Unknown
// keys are stripped, so a caller's own cache_control never arrives.
const userBlock = z.discriminatedUnion("type", [
  // MAX_BODY_CHARS, not MAX_USER_TEXT: the report digest rides as a text
  // block. What the person typed is measured in userTextTooLong.
  z.object({ type: z.literal("text"), text: z.string().max(MAX_BODY_CHARS) }),
  z.object({
    type: z.literal("tool_result"),
    tool_use_id: z.string().min(1).max(200),
    content: z.string().max(MAX_BODY_CHARS),
    is_error: z.boolean().optional(),
  }),
]);

// The assistant's turns go back exactly as the API returned them —
// signatures, ids, inputs — so their keys pass through untouched. What is
// refused is what never comes from this route's model: fetched sources and
// a caller's cache_control.
const assistantBlock = z
  .object({ type: z.string() })
  .passthrough()
  .refine((b) => !("source" in b) && !("cache_control" in b) && !["image", "document", "search_result"].includes(b.type));

// No .max on the list: a conversation over the cap is not malformed, it is
// too long, and it gets the same 413 as one over the size cap — the widget
// starts a new conversation on that status.
const chatBodySchema = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), content: z.union([z.string().max(MAX_BODY_CHARS), z.array(userBlock).max(50)]) }),
        z.object({ role: z.literal("assistant"), content: z.union([z.string().max(MAX_BODY_CHARS), z.array(assistantBlock).max(50)]) }),
      ])
    )
    .min(1),
});

const SECTIONS = ["score", "findings", "checklist", "wcag22", "team", "notes", "screenreader", "statement", "vpat", "simulator", "history", "audit", "settings"] as const;
const showInputSchema = z.object({ section: z.enum(SECTIONS) });

const scanInputSchema = z.object({
  url: z.string().min(1).max(2_000),
  scope: z.enum(["page", "site"]),
  ai_review: z.boolean(),
});

// The opening of the report digest the widget attaches as a text block
// (ScanChat.tsx). It is the one text block not written by the person, and
// it is bounded by the body cap instead; a test holds the two in step.
export const DIGEST_PREFIX = "The latest scan's report, which this conversation has not seen yet:\n";

/** What the person typed, per turn — string content and text blocks alike.
 *  The widget sends blocks, so a check of string content alone measured
 *  nothing it ever sent. */
function userTextTooLong(messages: z.infer<typeof chatBodySchema>["messages"]): boolean {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const blocks = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : m.content;
    let typed = 0;
    for (const b of blocks) {
      if (b.type !== "text" || b.text.startsWith(DIGEST_PREFIX)) continue;
      typed += b.text.length;
    }
    if (typed > MAX_USER_TEXT) return true;
  }
  return false;
}

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    "/api/chat",
    // Its own budget, looser than the scan's: a message costs a model call,
    // not a browser render. See CHAT_RATE_LIMIT_MAX.
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
    const raw = JSON.stringify(request.body ?? {});
    if (raw.length > MAX_BODY_CHARS) {
      return reply.status(413).send({ error: "The conversation is too long to continue. Start a new one." });
    }
    const parsed = chatBodySchema.safeParse(request.body);
    if (!parsed.success || userTextTooLong(parsed.data.messages)) {
      return reply.status(400).send({ error: "Invalid conversation" });
    }
    if (parsed.data.messages.length > MAX_MESSAGES) {
      return reply.status(413).send({ error: "The conversation is too long to continue. Start a new one." });
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
    // Headers and a first comment frame go out now, before the model has
    // said anything: a proxy that sees no bytes may hold the response, and
    // a visitor whose browser sees no response cannot tell waiting from
    // broken.
    res.flushHeaders();
    res.write(": open\n\n");
    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const params: Omit<Anthropic.Beta.MessageCreateParams, "messages" | "stream"> = {
      model: CHAT_MODEL,
      max_tokens: 16_000,
      // Opus 5.5 always thinks; effort is the control, and its default is
      // medium. Stated rather than inherited, so a change of default does
      // not quietly change what this costs.
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: CHAT_SYSTEM_PROMPT }],
      tools: [START_SCAN_TOOL, SHOW_SECTION_TOOL, WEB_SEARCH_TOOL],
      // Caches the growing conversation, report digest included, so a
      // follow-up question re-reads the report from cache.
      cache_control: { type: "ephemeral" },
      // A refusal on the primary model is retried on the fallback rather
      // than ending the person's turn.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
    };

    let messages = parsed.data.messages as Anthropic.Beta.BetaMessageParam[];
    let stream = client.beta.messages.stream({ ...params, messages });

    // The RESPONSE closing, not the request: on a POST the request's
    // "close" fires as soon as its body has been read, which Fastify does
    // before this handler runs — listening there aborted every model call
    // the moment it started, and the visitor waited on a response that
    // was never going to end.
    res.on("close", () => {
      if (!res.writableEnded) stream.abort();
    });

    try {
      // One turn may take several requests: a search loop the API pauses is
      // resumed by sending the paused turn back, and the pieces go to the
      // widget as one assistant turn. The API reads consecutive assistant
      // messages as one, so the joined turn is the conversation it saw.
      const content: Anthropic.Beta.BetaContentBlock[] = [];
      let final: Anthropic.Beta.BetaMessage;
      for (let resumed = 0; ; resumed++) {
        // Web searches in flight, by content block index, with their input
        // as it streams in. The widget is told when one starts, and told
        // the query once it has all arrived.
        const searches = new Map<number, string>();
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send("delta", { text: event.delta.text });
          } else if (event.type === "content_block_start" && event.content_block.type === "server_tool_use" && event.content_block.name === "web_search") {
            searches.set(event.index, "");
            send("searching", { query: null });
          } else if (event.type === "content_block_delta" && event.delta.type === "input_json_delta" && searches.has(event.index)) {
            searches.set(event.index, searches.get(event.index) + event.delta.partial_json);
          } else if (event.type === "content_block_stop" && searches.has(event.index)) {
            const query = searchQuery(searches.get(event.index) ?? "");
            searches.delete(event.index);
            if (query) send("searching", { query });
          }
        }
        final = await stream.finalMessage();
        content.push(...final.content);
        if (final.stop_reason !== "pause_turn" || resumed >= MAX_PAUSE_RESUMES || res.destroyed) break;
        messages = [...messages, { role: "assistant", content: final.content }];
        stream = client.beta.messages.stream({ ...params, messages });
      }

      if (final.stop_reason === "refusal") {
        send("done", {
          content: [{ type: "text", text: "I can't help with that one. Ask me something else, or name a site to check." }],
          stopReason: "refusal",
          scan: null,
          show: [],
        });
        res.end();
        return;
      }

      let scan: { toolUseId: string; url: string; scope: "page" | "site"; aiReview: boolean } | null = null;
      const show: Array<{ toolUseId: string; section: (typeof SECTIONS)[number] }> = [];
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "show_section") {
          const input = showInputSchema.safeParse(block.input);
          if (input.success) show.push({ toolUseId: block.id, section: input.data.section });
        }
        if (block.type === "tool_use" && block.name === "start_scan") {
          // Streamed input is not validated by the API; it is checked here
          // before the widget is told to act on it. One scan per turn, the
          // first asked for: the widget answers any other call with an
          // error result, so the history stays valid.
          const input = scanInputSchema.safeParse(block.input);
          if (input.success && !scan) {
            scan = {
              toolUseId: block.id,
              url: input.data.url,
              scope: input.data.scope,
              aiReview: input.data.ai_review,
            };
          }
        }
      }

      send("done", { content, stopReason: final.stop_reason, scan, show });
      res.end();
    } catch (err) {
      // The visitor left; there is nobody to tell.
      if (stream.aborted && res.destroyed) return;
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Chat turn failed");
      send("error", { error: "The assistant stopped responding. Try sending that again." });
      res.end();
    }
  }
  );
}
