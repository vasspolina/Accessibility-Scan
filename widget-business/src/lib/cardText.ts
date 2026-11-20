/**
 * A helper for the expanded finding's tiles (user's instruction,
 * 20 Nov 2026: "text shorter, broken by bullets if needed and less wordy").
 * The copy-card button that used to sit beside it was deleted the same day.
 */

/* A tile's words as points, or null to keep them as one sentence. A short
   text stays a sentence: two clipped points under a 15px label read as a
   form, not as an answer. Past this length, most often the AI review's
   "What we found", each sentence becomes a point so the eye finds them. */
const POINTS_FROM = 110;

/* A sentence ends at . ? or ! followed by a space and a capital, a figure,
   an opening quote or bracket. "e.g. a", "1.1.1" and "3.5:1" never split. */
const SENTENCE_END = /(?<=[.?!])\s+(?=[„“"'‘«(A-Z0-9À-ÖØ-Þ])/u;

export function toPoints(text: string | null | undefined): string[] | null {
  const s = (text ?? "").trim();
  if (s.length <= POINTS_FROM) return null;
  const parts = s.split(SENTENCE_END).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : null;
}
