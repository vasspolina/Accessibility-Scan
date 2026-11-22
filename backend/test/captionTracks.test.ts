import { describe, it, expect } from "vitest";
import {
  captionTracksFromWatchPage,
  lookUpEmbedCaptions,
  videoRefOf,
  vimeoState,
  youtubeState,
} from "../src/services/media/captionTracks.js";
import { evaluateMedia } from "../src/services/media/analyzeMedia.js";

// The shapes measured on 22 Nov 2026, cut down: a watch page's player
// response with one person's track and one automatic one, and a Vimeo
// player config with uploaded subtitles.
const watch = (tracks: string) =>
  `<script>var ytInitialPlayerResponse = {"playabilityStatus":{"status":"OK"},${tracks}"videoDetails":{}};</script>`;
const HUMAN = watch(`"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"x?a=1\\u0026b=[2]","languageCode":"en"},{"baseUrl":"y","kind":"asr","languageCode":"en"}]}},`);
const AUTO = watch(`"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"y","kind":"asr","languageCode":"en"}]}},`);
const NONE = watch("");
const CONSENT = `<html><title>Before you continue to YouTube</title></html>`;

describe("which video an embed points at", () => {
  it("reads YouTube's embed, nocookie, watch and short addresses", () => {
    expect(videoRefOf("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(videoRefOf("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(videoRefOf("https://youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(videoRefOf("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
  });

  it("reads Vimeo's player address and keeps an unlisted video's hash", () => {
    expect(videoRefOf("https://player.vimeo.com/video/76979871?h=8272103f6e&title=0")).toEqual({ provider: "vimeo", id: "76979871", hash: "8272103f6e" });
  });

  it("refuses anything else, so a page cannot steer the request", () => {
    expect(videoRefOf("https://www.youtube.com/embed/../../evil")).toBeNull();
    expect(videoRefOf("https://evil.test/embed/dQw4w9WgXcQ")).toBeNull();
    expect(videoRefOf("https://player.vimeo.com/video/abc")).toBeNull();
    expect(videoRefOf(undefined)).toBeNull();
  });
});

describe("what the provider says", () => {
  it("tells a person's captions from automatic ones on YouTube", () => {
    expect(captionTracksFromWatchPage(HUMAN)).toHaveLength(2);
    expect(youtubeState(HUMAN)).toBe("human");
    expect(youtubeState(AUTO)).toBe("auto-only");
    expect(youtubeState(NONE)).toBe("none");
  });

  it("reads a consent wall or an error as unknown, never as no captions", () => {
    expect(youtubeState(CONSENT)).toBe("unknown");
    expect(youtubeState(watch("").replace('"OK"', '"LOGIN_REQUIRED"'))).toBe("unknown");
  });

  it("reads Vimeo's text tracks and their provenance", () => {
    expect(vimeoState({ request: { text_tracks: [{ kind: "subtitles", label: "Deutsch", provenance: "user_uploaded" }] } })).toBe("human");
    expect(vimeoState({ request: { text_tracks: [{ kind: "captions", label: "English (auto-generated)", provenance: "ai_generated" }] } })).toBe("auto-only");
    expect(vimeoState({ request: { text_tracks: [] } })).toBe("none");
    expect(vimeoState({})).toBe("unknown");
  });

  it("asks once per video, only of the two providers, and answers unknown when they fail", async () => {
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      if (url.includes("vimeo")) throw new Error("timeout");
      return new Response(AUTO);
    }) as typeof fetch;
    const states = await lookUpEmbedCaptions(
      [
        { selector: "#a", src: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
        { selector: "#b", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" },
        { selector: "#c", src: "https://player.vimeo.com/video/1" },
        { selector: "#d", src: "https://player.example.com/v/1" },
      ],
      fetcher
    );
    expect(asked.filter((u) => u.includes("youtube"))).toHaveLength(1);
    expect(asked.every((u) => u.startsWith("https://www.youtube.com/") || u.startsWith("https://player.vimeo.com/"))).toBe(true);
    expect(Object.fromEntries(states)).toEqual({ "#a": "auto-only", "#b": "auto-only", "#c": "unknown" });
  });
});

describe("the undecided rows", () => {
  const embeds = ["#h", "#n", "#a", "#u"].map((selector) => ({ selector, provider: "YouTube", title: "" }));
  const states = new Map([
    ["#h", "human"],
    ["#n", "none"],
    ["#a", "auto-only"],
  ] as const);

  it("drops a video a person captioned and asks the right question of the rest", () => {
    const rows = evaluateMedia([], embeds, new Map(states));
    expect(rows.map((r) => [r.ruleId, r.count])).toEqual([
      ["media-embed-no-captions", 1],
      ["media-embed-auto-captions", 1],
      ["media-embedded-player", 1],
    ]);
  });

  it("keeps the old single row when nothing could be asked", () => {
    expect(evaluateMedia([], embeds).map((r) => [r.ruleId, r.count])).toEqual([["media-embedded-player", 4]]);
  });
});
