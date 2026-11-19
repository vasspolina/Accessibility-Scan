import type { FastifyInstance } from "fastify";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getClaudeClient } from "../services/aiReview/claudeClient.js";
import { COOKIE_CATEGORY_NAMES, COOKIE_CHAT_SYSTEM_PROMPT, SET_BANNER_TOOL } from "../services/cookieChat/cookiePrompt.js";

/**
 * POST /api/cookie-banner/chat — the chat on the cookie banner kit page.
 *
 * Stateless, like /api/chat: the page sends the whole conversation on every
 * turn and gets back the messages to append, exactly as the API returned
 * them (thinking blocks included, unedited, because the API ties them to the
 * conversation that produced them).
 *
 * set_banner is answered here, not on the page: the call is validated, a
 * tool result goes back to the model, and the model's closing words come in
 * the same response. The page receives the whole exchange to append plus the
 * banner to apply to its form, so it never has to send a tool result itself.
 *
 * Plain JSON, not a stream: replies are a few sentences at low effort.
 */

const CHAT_MODEL = "claude-opus-5-5";

// The endpoint spends this server's API key, so the caps are about cost as
// much as validity. A banner takes a handful of turns.
const MAX_MESSAGES = 40;
const MAX_USER_TEXT = 2_000;
const MAX_BODY_CHARS = 200_000;
// set_banner rounds per turn. One is normal; a second covers a model that
// corrects itself after a rejected call. Past that the turn ends as it is.
const MAX_TOOL_ROUNDS = 2;

const userBlock = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(MAX_USER_TEXT) }),
  z.object({
    type: z.literal("tool_result"),
    tool_use_id: z.string().min(1).max(200),
    content: z.string().max(2_000),
    is_error: z.boolean().optional(),
  }),
]);

// Assistant turns pass back as the API returned them. Refused: anything that
// never comes from this route's model, such as fetched sources or a caller's
// cache_control.
const assistantBlock = z
  .object({ type: z.string() })
  .passthrough()
  .refine((b) => !("source" in b) && !("cache_control" in b) && !["image", "document", "search_result"].includes(b.type));

const bodySchema = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), content: z.union([z.string().max(MAX_USER_TEXT), z.array(userBlock).max(20)]) }),
        z.object({ role: z.literal("assistant"), content: z.union([z.string().max(MAX_BODY_CHARS), z.array(assistantBlock).max(50)]) }),
      ])
    )
    .min(1),
});

const hex = z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]);

// Streamed or not, a tool input is checked before the page is told to act on
// it: strict mode keeps it schema-shaped, this keeps it sane.
export const bannerSchema = z.object({
  language: z.enum(["en", "de"]),
  policy_url: z.string().max(500).refine((u) => u === "" || /^(https?:\/\/|\/)/i.test(u), "policy_url must be a web address or a path"),
  categories: z
    .array(
      z.object({
        name: z.enum(COOKIE_CATEGORY_NAMES),
        label: z.string().max(60),
        text: z.string().min(1).max(400),
      })
    )
    .max(6)
    .refine((cs) => new Set(cs.map((c) => c.name)).size === cs.length, "each category once")
    .refine((cs) => cs.every((c) => c.name !== "other" || c.label.trim() !== ""), "other needs a label"),
  colours: z.object({ background: hex, text: hex, button: hex }),
});
export type Banner = z.infer<typeof bannerSchema>;

export async function cookieChatRoutes(app: FastifyInstance) {
  app.post(
    "/api/cookie-banner/chat",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      if (JSON.stringify(request.body ?? {}).length > MAX_BODY_CHARS) {
        return reply.status(413).send({ error: "too_long" });
      }
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid" });
      if (parsed.data.messages.length > MAX_MESSAGES) return reply.status(413).send({ error: "too_long" });
      const last = parsed.data.messages[parsed.data.messages.length - 1];
      if (last.role !== "user") return reply.status(400).send({ error: "invalid" });

      const client = getClaudeClient();
      if (!client) return reply.status(503).send({ error: "chat_unavailable" });

      const params: Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, "messages"> = {
        model: CHAT_MODEL,
        max_tokens: 16_000,
        // Opus 5.5 always thinks; effort is the control. Low: this is a short
        // chat with one tool, not a reasoning task.
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: [{ type: "text", text: COOKIE_CHAT_SYSTEM_PROMPT }],
        tools: [SET_BANNER_TOOL],
        cache_control: { type: "ephemeral" },
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
      };

      const history = parsed.data.messages as Anthropic.Beta.BetaMessageParam[];
      const added: Anthropic.Beta.BetaMessageParam[] = [];
      let banner: Banner | null = null;

      try {
        for (let round = 0; ; round++) {
          const res = await client.beta.messages.create({ ...params, messages: [...history, ...added] });

          if (res.stop_reason === "refusal") {
            added.push({ role: "assistant", content: res.content });
            return reply.send({ messages: added, banner, refused: true });
          }
          added.push({ role: "assistant", content: res.content });

          const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          if (res.stop_reason !== "tool_use" || calls.length === 0) break;

          // Every tool_use gets its result in one user message, as the API
          // requires. A call that fails validation is answered as an error,
          // so the model can correct it.
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = calls.map((call) => {
            const input = call.name === "set_banner" ? bannerSchema.safeParse(call.input) : null;
            if (input?.success) {
              banner = input.data;
              return { type: "tool_result", tool_use_id: call.id, content: "Applied. The form, preview and files now show this banner." };
            }
            return {
              type: "tool_result",
              tool_use_id: call.id,
              is_error: true,
              content: input ? `Not applied: ${input.error.issues.map((i) => i.message).join("; ")}` : "Unknown tool.",
            };
          });
          added.push({ role: "user", content: results });
          if (round + 1 >= MAX_TOOL_ROUNDS) {
            // The history must not end on a tool call the page cannot
            // answer; one more call, with tools off, closes the turn in words.
            const close = await client.beta.messages.create({ ...params, tool_choice: { type: "none" }, messages: [...history, ...added] });
            added.push({ role: "assistant", content: close.content });
            break;
          }
        }
        return reply.send({ messages: added, banner, refused: false });
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Cookie chat turn failed");
        return reply.status(502).send({ error: "chat_failed" });
      }
    }
  );
}
