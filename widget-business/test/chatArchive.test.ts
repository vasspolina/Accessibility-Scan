import { describe, expect, it } from "vitest";
import { historyFromTurns, settleTurn, titleOf } from "../src/lib/chatArchive";

describe("chatArchive", () => {
  it("names a conversation by its first question, cut at a word", () => {
    expect(titleOf([{ id: 1, who: "checker", text: "Hello" }, { id: 2, who: "you", text: "Is  this\nclear?" }])).toBe("Is this clear?");
    const long = titleOf([{ id: 1, who: "you", text: "How would a screen reader announce this button? Tell me what you can inspect." }]);
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long).not.toMatch(/\s…$/);
  });

  it("stores a running scan as stopped and drops streaming state", () => {
    expect(settleTurn({ id: 1, who: "scan", state: "running" }).state).toBe("failed");
    const reply = settleTurn({ id: 2, who: "checker", text: "Hi", streaming: true, marks: [], searching: null } as never);
    expect(reply).toEqual({ id: 2, who: "checker", text: "Hi" });
  });

  it("rebuilds an alternating history that opens with the reader", () => {
    const history = historyFromTurns([
      { id: 1, who: "checker", text: "Welcome" },
      { id: 2, who: "you", text: "Check example.com" },
      { id: 3, who: "scan", state: "done" },
      { id: 4, who: "checker", text: "Started." },
      { id: 5, who: "checker", text: "Done." },
      { id: 6, who: "block" },
      { id: 7, who: "you", text: "Why?" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Check example.com" },
      { role: "assistant", content: "Started.\n\nDone." },
      { role: "user", content: "Why?" },
    ]);
  });
});
