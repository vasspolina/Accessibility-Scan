import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityReport } from "../../types/report.js";

/**
 * Audio and video — WCAG 1.2.1 to 1.2.5.
 *
 * These five criteria were the only ones in the checklist with no signal
 * behind them at all. The renderer inspected media exactly once, to see
 * whether it autoplayed, so a page with four uncaptioned videos and a page
 * with none produced identical reports: five rows saying a person must
 * check, and nothing about what they would be checking.
 *
 * Nothing here is scored, and nothing here is stated as a failure. Whether a
 * video needs captions depends on whether it carries speech, and that cannot
 * be read off the DOM. Three things would each make a <track>-less video
 * perfectly conformant: it is silent, its captions are burned into the
 * picture, or its only audio is decorative. A checker that called every one
 * of them a failure would be wrong often enough to be worth ignoring — which
 * is the reputation this report exists to avoid.
 *
 * So the job here is smaller and honest: count the media, say where it is,
 * and name the question. "Somebody must check your videos" becomes "you have
 * three, here they are, here is what to ask about each one".
 *
 * One limitation worth knowing, measured rather than assumed. This sees the
 * page as it loads, and a player injected when somebody presses play is not
 * there yet. Checked against bbc.co.uk/news, a site full of video: at load it
 * has no <video>, no <audio>, and four iframes that are an A/B testing tool
 * and a cookie manager — while carrying 37 elements whose class says media or
 * player. Those are placeholders. Reaching that video would mean pressing
 * play on a stranger's page, so a site built this way reports no media, and
 * the count is a floor rather than a total.
 */

const CAPTIONS_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html";
const AUDIO_DESC_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/audio-description-or-media-alternative-prerecorded.html";
const AUDIO_ONLY_URL =
  "https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html";

/** A <track> that carries words for the audio. `descriptions` narrate the
 *  picture instead, and `chapters`/`metadata` are navigation aids — neither
 *  satisfies 1.2.2, so neither counts as captions here. */
function hasCaptionTrack(trackKinds: string[]): boolean {
  return trackKinds.some((k) => k === "captions" || k === "subtitles");
}

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];

export function evaluateMedia(
  media: DomSignals["mediaElements"],
  embeds: DomSignals["mediaEmbeds"]
): UndecidedRow[] {
  const rows: UndecidedRow[] = [];

  // A muted <video> is the background-loop case: silent by construction, so
  // there is no audio to caption and no question to ask. Excluding it is
  // what keeps this row about real candidates rather than every decorative
  // hero video on the web.
  const videos = media.filter((m) => m.tag === "video" && !m.muted);
  const videosWithout = videos.filter((v) => !hasCaptionTrack(v.trackKinds));
  if (videosWithout.length > 0) {
    rows.push({
      ruleId: "media-video-captions",
      count: videosWithout.length,
      help: "Video with no captions track",
      helpUrl: CAPTIONS_URL,
    });
  }

  // Audio description is a separate criterion from captions and a separate
  // track kind, so a video can satisfy one and not the other. Only asked
  // about video that already carries captions — a page that has not started
  // on captions does not need two rows telling it so.
  const captioned = videos.filter((v) => hasCaptionTrack(v.trackKinds));
  const withoutDescriptions = captioned.filter(
    (v) => !v.trackKinds.includes("descriptions")
  );
  if (withoutDescriptions.length > 0) {
    rows.push({
      ruleId: "media-video-descriptions",
      count: withoutDescriptions.length,
      help: "Captioned video with no audio description",
      helpUrl: AUDIO_DESC_URL,
    });
  }

  // Audio-only needs a transcript, and a transcript is ordinary page text —
  // there is no attribute that marks one, so its presence cannot be checked
  // at all. The count is the whole contribution.
  const audio = media.filter((m) => m.tag === "audio");
  if (audio.length > 0) {
    rows.push({
      ruleId: "media-audio-transcript",
      count: audio.length,
      help: "Audio with no transcript we can see",
      helpUrl: AUDIO_ONLY_URL,
    });
  }

  // An embedded player's document belongs to the provider, so whether its
  // video is captioned is not visible from this page at any cost. Grouped
  // into one row: the reader's next move is the same for all of them.
  if (embeds.length > 0) {
    rows.push({
      ruleId: "media-embedded-player",
      count: embeds.length,
      help: "Video embedded from another site",
      helpUrl: CAPTIONS_URL,
    });
  }

  return rows;
}
