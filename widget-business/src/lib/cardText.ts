/**
 * Two helpers for the expanded finding's tiles (user's instruction,
 * 20 Nov 2026: "text shorter, broken by bullets if needed and less wordy",
 * and a button on Who fixes this that copies the card to send on).
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

/** What the copy button puts on the clipboard: the card as plain text, in
 *  the order the person fixing it needs it, with each label already
 *  translated by the caller. Empty parts are left out. */
export function cardText(parts: {
  title: string;
  severity?: string;
  criterion?: string;
  found?: string | null;
  todo?: string | string[] | null;
  elements?: string[];
  more?: string;
  labels: { found: string; todo: string; elements: string; more: string };
}): string {
  const out: string[] = [];
  out.push(parts.title.trim());
  const meta = [parts.severity, parts.criterion ? `WCAG ${parts.criterion}` : ""].filter(Boolean).join(" · ");
  if (meta) out.push(meta);
  if (parts.found) out.push("", `${parts.labels.found}:`, parts.found.trim());
  if (parts.todo) {
    out.push("", `${parts.labels.todo}:`);
    if (Array.isArray(parts.todo)) for (const step of parts.todo) out.push(`- ${step}`);
    else out.push(parts.todo.trim());
  }
  if (parts.elements?.length) {
    out.push("", `${parts.labels.elements}:`);
    for (const el of parts.elements) out.push(`- ${el}`);
  }
  if (parts.more) out.push("", `${parts.labels.more}: ${parts.more}`);
  return out.join("\n");
}
