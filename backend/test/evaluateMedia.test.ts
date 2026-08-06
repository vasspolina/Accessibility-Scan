import { describe, it, expect } from "vitest";
import { evaluateMedia } from "../src/services/media/analyzeMedia.js";
import type { DomSignals } from "../src/services/render/renderPage.js";

function video(overrides: Partial<DomSignals["mediaElements"][number]> = {}) {
  return {
    selector: "video",
    tag: "video" as const,
    trackKinds: [] as string[],
    muted: false,
    hasControls: true,
    label: "",
    ...overrides,
  };
}

function embed(overrides: Partial<DomSignals["mediaEmbeds"][number]> = {}) {
  return { selector: "iframe", provider: "YouTube", title: "", ...overrides };
}

const ids = (rows: ReturnType<typeof evaluateMedia>) => rows.map((r) => r.ruleId);

describe("evaluateMedia", () => {
  it("asks about a video with no captions track", () => {
    const rows = evaluateMedia([video()], []);
    expect(ids(rows)).toContain("media-video-captions");
    expect(rows[0].count).toBe(1);
  });

  it("says nothing about a muted video", () => {
    // The background-loop case: silent by construction, so there is no audio
    // to caption. Asking about it would bury the real candidates.
    expect(evaluateMedia([video({ muted: true })], [])).toEqual([]);
  });

  it("accepts either captions or subtitles as a caption track", () => {
    expect(ids(evaluateMedia([video({ trackKinds: ["captions"] })], []))).not.toContain(
      "media-video-captions"
    );
    expect(ids(evaluateMedia([video({ trackKinds: ["subtitles"] })], []))).not.toContain(
      "media-video-captions"
    );
  });

  it("does not count a descriptions or metadata track as captions", () => {
    // Both are real track kinds that carry something other than the words
    // being spoken, so neither answers 1.2.2.
    expect(
      ids(evaluateMedia([video({ trackKinds: ["descriptions", "metadata"] })], []))
    ).toContain("media-video-captions");
  });

  it("asks about audio description only once captions exist", () => {
    // A page that has not started on captions does not need two rows saying so.
    expect(ids(evaluateMedia([video()], []))).not.toContain("media-video-descriptions");
    expect(ids(evaluateMedia([video({ trackKinds: ["captions"] })], []))).toContain(
      "media-video-descriptions"
    );
    expect(
      ids(evaluateMedia([video({ trackKinds: ["captions", "descriptions"] })], []))
    ).not.toContain("media-video-descriptions");
  });

  it("counts audio elements, whose transcript is never visible to us", () => {
    const rows = evaluateMedia([video({ tag: "audio", selector: "audio" })], []);
    expect(ids(rows)).toEqual(["media-audio-transcript"]);
  });

  it("groups embedded players into one row", () => {
    const rows = evaluateMedia([], [embed(), embed({ provider: "Vimeo" })]);
    expect(ids(rows)).toEqual(["media-embedded-player"]);
    expect(rows[0].count).toBe(2);
  });

  it("says nothing about a page with no media", () => {
    expect(evaluateMedia([], [])).toEqual([]);
  });

  it("never reports a count it cannot back with an element", () => {
    // The whole contract of this analyzer: every row is a count of things
    // actually found, since none of them is a failure it could overstate.
    const rows = evaluateMedia([video(), video({ selector: "video.two" })], [embed()]);
    for (const r of rows) expect(r.count).toBeGreaterThan(0);
    expect(rows.find((r) => r.ruleId === "media-video-captions")!.count).toBe(2);
  });
});
