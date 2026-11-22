// Asks YouTube and Vimeo whether an embedded video has captions.
//
// An embedded player's document belongs to the provider, so the page itself
// cannot say (analyzeMedia.ts). The provider can, without a key:
//
//   YouTube  the watch page carries the player's own caption list
//            ("captionTracks"); a track with kind "asr" is YouTube's
//            automatic speech recognition, any other was added by a person.
//   Vimeo    the player config (player.vimeo.com/video/<id>/config) lists
//            request.text_tracks, each with a provenance; "user_uploaded"
//            is a person's file.
//
// Measured on 22 Nov 2026: the watch page of a well-known captioned video
// listed six tracks, one of them "asr"; a Vimeo staff pick listed three
// user_uploaded tracks.
//
// Three answers and an honest fourth: captions by a person, only automatic
// captions, none at all, or unknown (the provider did not answer, the
// video is private, the page changed shape). Unknown leaves the video where
// it was, in "Video embedded from another site", rather than guessing.
//
// The requests go only to www.youtube.com and player.vimeo.com, with an id
// that matched a strict pattern, so a page cannot steer the server anywhere
// else. Bounded: at most MAX_LOOKUPS videos, a few seconds each, in parallel.

export type CaptionState = "human" | "auto-only" | "none" | "unknown";
export interface VideoRef {
  provider: "youtube" | "vimeo";
  id: string;
  /** Vimeo's privacy hash for an unlisted video, from the embed's ?h=. */
  hash?: string;
}

export const MAX_LOOKUPS = 6;
const LOOKUP_TIMEOUT_MS = 5000;

/** The video an embed address points at, or null for anything else. Pure. */
export function videoRefOf(src: string | undefined): VideoRef | null {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (/(^|\.)(youtube\.com|youtube-nocookie\.com)$/.test(host)) {
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:$|[/?])/);
    const id = m?.[1] ?? url.searchParams.get("v") ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1, 12);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "player.vimeo.com" || host === "vimeo.com" || host === "www.vimeo.com") {
    const m = url.pathname.match(/^\/(?:video\/)?(\d{1,12})(?:$|\/)/);
    if (!m) return null;
    const h = url.searchParams.get("h");
    return { provider: "vimeo", id: m[1], ...(h && /^[0-9a-f]{6,20}$/i.test(h) ? { hash: h } : {}) };
  }
  return null;
}

/** The JSON array that follows "captionTracks": in a watch page, read by bracket depth. */
export function captionTracksFromWatchPage(html: string): Array<{ kind?: string; languageCode?: string }> | null {
  const at = html.indexOf('"captionTracks":');
  if (at < 0) return null;
  const start = html.indexOf("[", at);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length && i < start + 200_000; i++) {
    const c = html[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Pure: what a YouTube watch page says about its captions. */
export function youtubeState(html: string): CaptionState {
  // The player must have loaded for its silence to mean anything: a consent
  // wall, an error page or a private video lists no tracks either.
  if (!/"playabilityStatus":\{"status":"OK"/.test(html)) return "unknown";
  const tracks = captionTracksFromWatchPage(html);
  if (tracks === null) return html.includes('"captions":') ? "unknown" : "none";
  if (tracks.length === 0) return "none";
  return tracks.some((t) => t.kind !== "asr") ? "human" : "auto-only";
}

/** Pure: what a Vimeo player config says about its captions. */
export function vimeoState(config: unknown): CaptionState {
  const tracks = (config as { request?: { text_tracks?: Array<{ kind?: string; label?: string; provenance?: string }> } })?.request
    ?.text_tracks;
  if (!Array.isArray(tracks)) return "unknown";
  const words = tracks.filter((t) => t.kind === "captions" || t.kind === "subtitles");
  if (words.length === 0) return "none";
  const automatic = (t: { label?: string; provenance?: string }) =>
    /auto|machine|ai[_-]?generated|asr/i.test(`${t.provenance ?? ""} ${t.label ?? ""}`);
  return words.some((t) => !automatic(t)) ? "human" : "auto-only";
}

type Fetcher = typeof fetch;

export async function captionStateOf(ref: VideoRef, fetcher: Fetcher = fetch): Promise<CaptionState> {
  try {
    if (ref.provider === "youtube") {
      const res = await fetcher(`https://www.youtube.com/watch?v=${ref.id}&hl=en`, {
        headers: {
          "accept-language": "en",
          // Without it a request from the EU is sent to the consent page,
          // which lists no tracks. SOCS=CAI declines the optional cookies.
          cookie: "SOCS=CAI",
          "user-agent": "Mozilla/5.0 (compatible; A11yCheckerBot/0.1; +accessibility scan)",
        },
        redirect: "error",
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      return res.ok ? youtubeState(await res.text()) : "unknown";
    }
    const res = await fetcher(`https://player.vimeo.com/video/${ref.id}/config${ref.hash ? `?h=${ref.hash}` : ""}`, {
      headers: { accept: "application/json", "user-agent": "A11yCheckerBot/0.1 (+accessibility scan)" },
      redirect: "error",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    return res.ok ? vimeoState(await res.json()) : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * The caption state of each embed it could identify, keyed by selector.
 * Embeds of the same video are asked about once.
 */
export async function lookUpEmbedCaptions(
  embeds: Array<{ selector: string; src?: string }>,
  fetcher: Fetcher = fetch
): Promise<Map<string, CaptionState>> {
  const out = new Map<string, CaptionState>();
  const byVideo = new Map<string, { ref: VideoRef; selectors: string[] }>();
  for (const e of embeds) {
    const ref = videoRefOf(e.src);
    if (!ref) continue;
    const key = `${ref.provider}:${ref.id}`;
    const entry = byVideo.get(key) ?? { ref, selectors: [] };
    entry.selectors.push(e.selector);
    byVideo.set(key, entry);
  }
  const videos = [...byVideo.values()].slice(0, MAX_LOOKUPS);
  const states = await Promise.all(videos.map((v) => captionStateOf(v.ref, fetcher)));
  videos.forEach((v, i) => v.selectors.forEach((sel) => out.set(sel, states[i])));
  return out;
}
