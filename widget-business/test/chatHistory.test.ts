import { describe, it, expect } from "vitest";
import { appendUser, unansweredToolUses, type ChatMessage } from "../src/api/chatClient";

/**
 * The two rules that keep the conversation valid for the API: every
 * tool_use is answered in the very next user message, and tool results sit
 * ahead of anything else in it. A history that breaks either is refused on
 * every later request, and the history is append-only — so these are
 * checked here, not left to the model's habits.
 */

const assistantWith = (...ids: string[]): ChatMessage => ({
  role: "assistant",
  content: [
    { type: "thinking", thinking: "", signature: "sig" },
    ...ids.map((id) => ({ type: "tool_use", id, name: "start_scan", input: {} })),
  ],
});

describe("appendUser", () => {
  it("adds a user message after an assistant turn", () => {
    const history: ChatMessage[] = [{ role: "user", content: "hi" }, assistantWith("a")];
    const next = appendUser(history, [{ type: "tool_result", tool_use_id: "a", content: "ok" }]);
    expect(next).toHaveLength(3);
    expect(next[2].role).toBe("user");
  });

  it("joins a user message already at the end, tool results first", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "hi" },
      assistantWith("a", "b"),
      { role: "user", content: [{ type: "tool_result", tool_use_id: "a", content: "shown" }] },
    ];
    const next = appendUser(history, [
      { type: "text", text: "and the law?" },
      { type: "tool_result", tool_use_id: "b", content: "one scan at a time" },
    ]);
    expect(next).toHaveLength(3);
    const content = next[2].content as Array<{ type: string }>;
    expect(content.map((b) => b.type)).toEqual(["tool_result", "tool_result", "text"]);
  });

  it("turns a trailing string message into blocks before joining", () => {
    const next = appendUser([{ role: "user", content: "first" }], [{ type: "text", text: "second" }]);
    expect(next).toEqual([
      { role: "user", content: [{ type: "text", text: "first" }, { type: "text", text: "second" }] },
    ]);
  });

  it("never touches an assistant turn", () => {
    const assistant = assistantWith("a");
    const history: ChatMessage[] = [{ role: "user", content: "hi" }, assistant];
    const next = appendUser(history, [{ type: "tool_result", tool_use_id: "a", content: "ok" }]);
    expect(next[1]).toBe(assistant);
    expect(history).toHaveLength(2);
  });
});

describe("unansweredToolUses", () => {
  it("answers, with an error, every call nothing else will", () => {
    const content = (assistantWith("a", "b", "c").content as Array<Record<string, unknown> & { type: string }>);
    const results = unansweredToolUses(content, ["a"]);
    expect(results.map((r) => r.tool_use_id)).toEqual(["b", "c"]);
    expect(results.every((r) => r.is_error === true && r.type === "tool_result")).toBe(true);
  });

  it("has nothing to add when every call is answered", () => {
    const content = (assistantWith("a").content as Array<Record<string, unknown> & { type: string }>);
    expect(unansweredToolUses(content, ["a"])).toEqual([]);
  });
});
