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

describe("chat results", () => {
  it("ties a result to a conversation that scanned, showed or shared it", async () => {
    const { chatUsesResult } = await import("../src/lib/chatResults");
    const turns = [
      { who: "you" },
      { who: "scan", resultKey: "k1" },
      { who: "block", resultKey: "k1" },
    ];
    expect(chatUsesResult(turns, null, "k1")).toBe(true);
    expect(chatUsesResult(turns, null, "k2")).toBe(false);
    expect(chatUsesResult([{ who: "you" }], "k2", "k2")).toBe(true);
    expect(chatUsesResult(turns, "k1", null)).toBe(false);
  });

  it("keeps a conversation's result in memory where IndexedDB is missing", async () => {
    const { putChatResult, getChatResult, deleteChatResult, pruneChatResults } = await import("../src/lib/chatResults");
    const result = { kind: "audit", audit: { scannedAt: "k1" } } as never;
    await putChatResult("c1", result);
    await putChatResult("c2", result);
    expect(await getChatResult("c1")).toBe(result);
    await deleteChatResult("c1");
    expect(await getChatResult("c1")).toBeNull();
    await pruneChatResults(new Set());
    expect(await getChatResult("c2")).toBeNull();
  });
});

describe("saving over another tab's list", () => {
  it("writes over the stored list, not the page's stale copy", async () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
    try {
      const { saveChat, loadChats } = await import("../src/lib/chatArchive");
      const a = { id: "a", title: "A", updatedAt: "2026-11-18T10:00:00Z", turns: [] };
      const b = { id: "b", title: "B", updatedAt: "2026-11-18T11:00:00Z", turns: [] };
      const c = { id: "c", title: "C", updatedAt: "2026-11-18T12:00:00Z", turns: [] };
      // Two tabs read the same empty list; each saves its own chat.
      const tab1 = saveChat([], a);
      saveChat([], b);
      // Tab 1 saves again from its stale list, which never saw B.
      saveChat(tab1, c);
      expect(loadChats().map((x) => x.id)).toEqual(["c", "b", "a"]);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
