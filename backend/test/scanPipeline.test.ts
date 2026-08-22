import { describe, it, expect } from "vitest";
import { dropAxeEchoes, mergeUndecided } from "../src/services/scanPipeline.js";
import type { AccessibilityFinding } from "../src/types/report.js";

describe("one fault, one card — the axe/own-probe echoes", () => {
  const f = (ruleId: string, over: Partial<AccessibilityFinding> = {}): AccessibilityFinding => ({
    id: ruleId,
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "meta",
    description: "d",
    suggestedFix: "s",
    ruleId,
    ...over,
  });

  it("drops axe's meta-refresh when our timing probe proved the same tag", () => {
    const out = dropAxeEchoes([f("meta-refresh"), f("timing-meta-refresh")]);
    expect(out.map((x) => x.ruleId)).toEqual(["timing-meta-refresh"]);
  });

  it("keeps axe's meta-refresh when our probe did not fire", () => {
    // An echo filter, not a disable list: axe alone still counts.
    const out = dropAxeEchoes([f("meta-refresh"), f("image-alt")]);
    expect(out.map((x) => x.ruleId)).toEqual(["meta-refresh", "image-alt"]);
  });

  it("drops axe's video-caption open question when our media row asks the same thing", () => {
    const merged = mergeUndecided(
      [{ ruleId: "video-caption", count: 1, help: "axe", helpUrl: "u" }],
      [{ ruleId: "media-video-captions", count: 1, help: "ours", helpUrl: "u" }]
    );
    expect(merged?.map((r) => r.ruleId)).toEqual(["media-video-captions"]);
  });

  it("keeps axe's video-caption when we asked nothing about the video", () => {
    const merged = mergeUndecided(
      [{ ruleId: "video-caption", count: 1, help: "axe", helpUrl: "u" }],
      []
    );
    expect(merged?.map((r) => r.ruleId)).toEqual(["video-caption"]);
  });
});
