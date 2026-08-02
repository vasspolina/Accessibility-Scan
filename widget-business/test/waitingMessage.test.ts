import { describe, it, expect } from "vitest";
import { waitingMessage } from "../src/App";

describe("waitingMessage", () => {
  // The reason this function exists rather than a template string with the
  // seconds in it. The element holding this text is a live region, so a
  // screen reader re-announces every time it changes — text mentioning the
  // running count would speak once a second, which on a tool about not
  // irritating screen reader users would be a poor advertisement.
  it("says the same thing for long stretches, so it is announced rarely", () => {
    const said = new Set<string>();
    for (let s = 0; s <= 120; s++) said.add(waitingMessage("page", false, s));
    expect(said.size).toBeLessThanOrEqual(3);
  });

  it("never mentions the elapsed count, which is what would make it chatty", () => {
    for (const s of [3, 17, 30, 61, 119]) {
      expect(waitingMessage("page", false, s)).not.toMatch(/\d/);
    }
  });

  // The thresholds are measured rather than hopeful: light pages land near
  // twenty seconds, moma.org around forty, the Guardian has taken eighty.
  it("stops promising a quick answer once the scan is plainly not quick", () => {
    expect(waitingMessage("page", false, 5)).toContain("Most pages");
    expect(waitingMessage("page", false, 30)).toContain("Still at it");
    expect(waitingMessage("page", false, 70)).toContain("unusually heavy");
  });

  it("blames the AI review for the wait only when it was asked for", () => {
    expect(waitingMessage("page", true, 30)).toContain("AI review");
    expect(waitingMessage("page", false, 30)).not.toContain("AI review");
  });

  it("keeps its own message for a whole-site audit at any elapsed time", () => {
    for (const s of [1, 40, 300]) {
      expect(waitingMessage("site", false, s)).toContain("Each page in turn");
    }
  });
});
