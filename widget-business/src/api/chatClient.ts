/**
 * The widget's side of /api/chat.
 *
 * The conversation lives here, in the shape the API takes it, and travels
 * whole on every turn. Assistant turns are stored as the exact blocks the
 * server returned and never edited afterwards: the API ties thinking blocks
 * to the conversation that produced them, so the history is append-only.
 * The blocks are opaque to the widget for the same reason — it reads the
 * text out of them for display and touches nothing else.
 */

import { t } from "../lib/strings";

export type ChatBlock = Record<string, unknown> & { type: string };
export type ChatMessage = { role: "user" | "assistant"; content: string | ChatBlock[] };

export interface ScanRequest {
  toolUseId: string;
  url: string;
  scope: "page" | "site";
  aiReview: boolean;
}

/** The assistant asked for a section of the report to be shown in the
 *  thread. The section key is one of lib/sections.ts's. */
export interface ShowRequest {
  toolUseId: string;
  section: string;
}

export interface ChatTurnResult {
  content: ChatBlock[];
  scan: ScanRequest | null;
  show: ShowRequest[];
}

/** The server has no assistant: no API key, or the route is absent on an
 *  older backend. The widget falls back to scanning the address it was
 *  given, and says so. */
export class ChatUnavailableError extends Error {}

export class ChatError extends Error {
  /** The HTTP status when the server answered with one; 413 means the
   *  conversation has outgrown the server's caps. */
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Display text of an assistant turn: its text blocks, in order. */
export function textOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

export async function sendChatTurn(
  apiBase: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<ChatTurnResult> {
  let response: Response;
  try {
    response = await fetch(`${apiBase.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // A dropped connection is not the server saying it has no assistant:
    // the next message asks again.
    throw new ChatError(t("Could not reach the assistant. Try sending that again."));
  }

  // Only the server's own word switches the assistant off: the route is
  // absent on an older backend, or it answered 503 with its own body. A bare
  // 503 from the proxy during a redeploy is a blip, not an answer — taking
  // it as one switched the whole session to the fallback for good.
  if (response.status === 404) throw new ChatUnavailableError("No assistant on this server.");
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    if (response.status === 503 && body.error === "chat_unavailable") {
      throw new ChatUnavailableError("No assistant on this server.");
    }
    // The server's wording is English and written for developers; the
    // person reads the widget's own, in their language.
    throw new ChatError(
      response.status === 413
        ? t("This conversation is too long to continue. Send your question again to start a new one.")
        : response.status === 503
          ? t("Could not reach the assistant. Try sending that again.")
          : t("The assistant could not answer that."),
      response.status
    );
  }

  // Server-sent events over a POST, so EventSource cannot be used; the
  // frames are parsed by hand. Each frame is "event: x\ndata: {...}".
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ChatTurnResult | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const data = /^data: (.+)$/m.exec(frame)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === "delta") onDelta(payload.text);
      else if (event === "done") result = { content: payload.content, scan: payload.scan, show: payload.show ?? [] };
      else if (event === "error") throw new ChatError(t("The assistant stopped responding. Try sending that again."));
    }
  }

  if (!result) throw new ChatError(t("The assistant stopped responding. Try sending that again."));
  return result;
}

/** The history with blocks added as the person's turn. Joined to a user
 *  message already at the end rather than following it: tool results must
 *  sit in the one message right after the assistant turn that called the
 *  tools, ahead of anything else in it. Only the trailing user message is
 *  ever rebuilt — assistant turns are never touched. */
export function appendUser(history: ChatMessage[], blocks: ChatBlock[]): ChatMessage[] {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") return [...history, { role: "user", content: blocks }];
  const earlier: ChatBlock[] = typeof last.content === "string" ? [{ type: "text", text: last.content }] : last.content;
  const all = [...earlier, ...blocks];
  const results = all.filter((b) => b.type === "tool_result");
  const rest = all.filter((b) => b.type !== "tool_result");
  return [...history.slice(0, -1), { role: "user", content: [...results, ...rest] }];
}

/** Error results for every tool call in an assistant turn that nothing
 *  else will answer: a second start_scan in one turn, or a call whose input
 *  failed the server's check. Every tool_use needs its tool_result before
 *  the next request, or every later request is refused — and the history
 *  is append-only, so the gap could never be closed afterwards. */
export function unansweredToolUses(content: ChatBlock[], answered: Iterable<string>): ChatBlock[] {
  const done = new Set(answered);
  return content
    .filter((b) => b.type === "tool_use" && typeof b.id === "string" && !done.has(b.id))
    .map((b) => ({
      type: "tool_result",
      tool_use_id: b.id as string,
      is_error: true,
      content:
        b.name === "start_scan"
          ? "One scan at a time. Ask for this address again once the first scan has finished."
          : "The checker could not act on this call.",
    }));
}

/** A best-guess address from free text, for when there is no assistant to
 *  ask. Deliberately narrow: a word with a dot and a known shape. */
export function addressIn(text: string): string | null {
  const match = text.match(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
  return match ? match[1].replace(/[.,;:!?)]+$/, "") : null;
}
