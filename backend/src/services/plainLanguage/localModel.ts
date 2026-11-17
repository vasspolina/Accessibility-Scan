import type { z } from "zod";
import { env, hasLocalModel } from "../../config/env.js";

/**
 * A small model the deployer hosts themselves, over the OpenAI chat API.
 *
 * Ollama, llama.cpp's llama-server and vLLM all answer
 * POST {base}/v1/chat/completions with the same shape, so one plain fetch
 * covers the three and there is no SDK to add. `response_format:
 * json_object` is honoured by all three; the answer is still parsed and
 * checked against a zod schema here, because a 7B model that is asked for
 * JSON usually returns it and occasionally returns JSON of the wrong shape.
 *
 * Nothing in this file decides what is true. It returns what the model
 * wrote, checked for shape, or a named reason it could not.
 */

export type LocalModelErrorKind = "not_configured" | "timeout" | "http" | "malformed" | "unreachable";

export type LocalModelResult<T> =
  | { ok: true; value: T; ms: number }
  | { ok: false; kind: LocalModelErrorKind; detail?: string };

export interface LocalModelCall<S extends z.ZodTypeAny> {
  system: string;
  user: string;
  schema: S;
  /** Hard ceiling for this one call. */
  timeoutMs: number;
  /** Abort from outside, e.g. when the scan's whole budget runs out. */
  signal?: AbortSignal;
  maxTokens?: number;
}

export function localModelName(): string | undefined {
  return hasLocalModel ? env.LOCAL_LLM_MODEL : undefined;
}

/** The chat endpoint for a base URL given with or without /v1 and a trailing slash. */
export function chatEndpoint(base: string): string {
  const trimmed = base.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${trimmed}/v1/chat/completions`;
}

/**
 * Pull the JSON object out of a model's reply. Small models sometimes wrap
 * it in a ```json fence or a sentence despite json_object mode (llama-server
 * without a grammar does), so the outermost {...} is taken rather than
 * failing on the first stray character.
 */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

export async function callLocalModel<S extends z.ZodTypeAny>(
  call: LocalModelCall<S>
): Promise<LocalModelResult<z.infer<S>>> {
  if (!hasLocalModel || !env.LOCAL_LLM_URL) return { ok: false, kind: "not_configured" };
  const started = Date.now();
  const timeout = AbortSignal.timeout(call.timeoutMs);
  const signal = call.signal ? AbortSignal.any([timeout, call.signal]) : timeout;
  let res: Response;
  try {
    res = await fetch(chatEndpoint(env.LOCAL_LLM_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.LOCAL_LLM_API_KEY ? { Authorization: `Bearer ${env.LOCAL_LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: env.LOCAL_LLM_MODEL,
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
        response_format: { type: "json_object" },
        // Low, not zero: at zero Qwen 7B repeats a phrase across fields.
        temperature: 0.2,
        max_tokens: call.maxTokens ?? 600,
        stream: false,
      }),
      signal,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, kind: "timeout" };
    return { ok: false, kind: "unreachable", detail: (err as Error).message };
  }
  if (!res.ok) return { ok: false, kind: "http", detail: String(res.status) };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, kind: "malformed", detail: "response was not JSON" };
  }
  const content = (body as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message
    ?.content;
  if (typeof content !== "string") return { ok: false, kind: "malformed", detail: "no message content" };
  const parsed = call.schema.safeParse(extractJsonObject(content));
  if (!parsed.success) return { ok: false, kind: "malformed", detail: "reply did not match the schema" };
  return { ok: true, value: parsed.data, ms: Date.now() - started };
}
