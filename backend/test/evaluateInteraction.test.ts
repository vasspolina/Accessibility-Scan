import { describe, it, expect } from "vitest";
import { evaluateInteraction } from "../src/services/interaction/analyzeInteraction.js";

const base = {
  motion: false,
  keyboardGlobal: false,
  pressWithoutRelease: [] as string[],
  actsOnChange: [] as string[],
};
const ids = (rows: ReturnType<typeof evaluateInteraction>) => rows.map((r) => r.ruleId);

describe("evaluateInteraction", () => {
  it("says nothing about a page that listens for none of it", () => {
    expect(evaluateInteraction(base)).toEqual([]);
  });

  it("asks about a motion listener", () => {
    expect(ids(evaluateInteraction({ ...base, motion: true }))).toEqual([
      "interaction-motion-actuation",
    ]);
  });

  it("asks about page-wide key handlers", () => {
    expect(ids(evaluateInteraction({ ...base, keyboardGlobal: true }))).toEqual([
      "interaction-key-shortcuts",
    ]);
  });

  it("counts controls that act on press", () => {
    const rows = evaluateInteraction({
      ...base,
      pressWithoutRelease: ["button.a", "div.b"],
    });
    expect(ids(rows)).toEqual(["interaction-pointer-cancellation"]);
    expect(rows[0].count).toBe(2);
  });

  it("asks about controls that look like they act on change", () => {
    const rows = evaluateInteraction({ ...base, actsOnChange: ["select#sort"] });
    expect(ids(rows)).toEqual(["interaction-acts-on-change"]);
    expect(rows[0].count).toBe(1);
  });

  it("reports all four together when all four are present", () => {
    const rows = evaluateInteraction({
      motion: true,
      keyboardGlobal: true,
      pressWithoutRelease: ["button.a"],
      actsOnChange: ["select#sort"],
    });
    expect(rows).toHaveLength(4);
  });

  it("asks about status messages only where there is something to operate", () => {
    // A page with no controls produces no updates to announce, so asking it
    // about live regions would be asking about something that cannot happen.
    expect(ids(evaluateInteraction(base, { liveRegions: 0, hasControls: false }))).toEqual([]);
    expect(ids(evaluateInteraction(base, { liveRegions: 0, hasControls: true }))).toEqual([
      "interaction-no-status-region",
    ]);
  });

  it("says nothing when the page already has a live region", () => {
    expect(ids(evaluateInteraction(base, { liveRegions: 2, hasControls: true }))).toEqual([]);
  });

  it("skips the status question entirely when not given the signal", () => {
    expect(ids(evaluateInteraction(base))).toEqual([]);
  });

  it("gives every row a help URL, since none of them is self-explanatory", () => {
    const rows = evaluateInteraction({
      motion: true,
      keyboardGlobal: true,
      pressWithoutRelease: ["button.a"],
      actsOnChange: ["select#sort"],
    });
    for (const r of rows) expect(r.helpUrl).toMatch(/^https:\/\/www\.w3\.org\//);
  });
});
