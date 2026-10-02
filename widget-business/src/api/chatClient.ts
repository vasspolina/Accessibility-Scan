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

export class ChatError extends Error {}

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
    throw new ChatUnavailableError("Could not reach the assistant.");
  }

  if (response.status === 503 || response.status === 404) throw new ChatUnavailableError("No assistant on this server.");
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new ChatError(body.error ?? "The assistant could not answer that.");
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
      else if (event === "error") throw new ChatError(payload.error);
    }
  }

  if (!result) throw new ChatError("The assistant stopped responding. Try sending that again.");
  return result;
}

/** A best-guess address from free text, for when there is no assistant to
 *  ask. Deliberately narrow: a word with a dot and a known shape. */
export function addressIn(text: string): string | null {
  const match = text.match(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
  return match ? match[1].replace(/[.,;:!?)]+$/, "") : null;
}
