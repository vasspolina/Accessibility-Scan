/**
 * Two small helps for the box you type in (user's instruction, 18 Nov
 * 2026: "i would like to click website so it is researching it also add
 * suggestions on tab like claude").
 *
 * addressToConfirm: the assistant asks once when it had to correct a typed
 * address ("Did you mean accessibility.nl?", chatPrompt.ts). That address
 * becomes a button under the reply, so one press says yes and the scan
 * starts, instead of typing the yes.
 *
 * tabSuggestion: the line Tab would fill in, as in Claude's apps. With
 * nothing typed, the yes to a pending address. While typing, the rest of an
 * opening question that starts with what is typed, so a question from the
 * cards can be finished with one key.
 */

// An address as a person writes one: a scheme or not, dotted labels, a
// letters-only ending of two or more, and an optional path. Figures such as
// 4.5:1 or 2.1 never match, since the ending must be letters.
const ADDRESS = /(?:https?:\/\/)?(?:[\p{L}\d-]+\.)+\p{L}{2,}(?:\/[^\s?!,;:)»"”’]*)?/giu;

/** The one address a short closing question asks about, or null. */
export function addressToConfirm(reply: string): string | null {
  const text = reply.trim();
  if (!text.endsWith("?") || text.length > 280) return null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const last = sentences[sentences.length - 1];
  const found = [...last.matchAll(ADDRESS)].map((m) => m[0].replace(/[./]+$/, ""));
  const unique = [...new Set(found)];
  return unique.length === 1 ? unique[0] : null;
}

export function tabSuggestion(
  draft: string,
  { confirmReply, prompts }: { confirmReply: string | null; prompts: string[] }
): string | null {
  const typed = draft.trimStart();
  if (!typed) return confirmReply;
  // One letter matches too much to be worth a suggestion.
  if (typed.trim().length < 2) return null;
  const lower = typed.toLowerCase();
  const completes = (s: string) => s.length > typed.length && s.toLowerCase().startsWith(lower);
  if (confirmReply && completes(confirmReply)) return confirmReply;
  return prompts.find(completes) ?? null;
}
