/**
 * Takes the reader from a summary line to the finding itself: scrolls its
 * row into view, opens it, and moves keyboard focus to the row's toggle so
 * the next Tab continues from there and a screen reader hears where it
 * landed.
 *
 * Finds the row by the `data-finding` mark the findings tables put on each
 * row's title (findingRow, ProfessionalTable), searched in the widget's own
 * shadow root: document.querySelector cannot see inside it.
 *
 * Returns false when the finding is not on screen (the conversation shows
 * sections one at a time), so the caller can leave the link to do nothing
 * rather than pretend it went somewhere.
 */
export function openFinding(from: HTMLElement, findingId: string): boolean {
  const root = from.getRootNode() as Document | ShadowRoot;
  const marks = root.querySelectorAll<HTMLElement>(`[data-finding="${CSS.escape(findingId)}"]`);
  // The first one that is drawn: print-only copies have no layout box.
  const mark = Array.from(marks).find((el) => el.getClientRects().length > 0);
  const row = mark?.closest("tr");
  if (!row) return false;

  const toggle = row.querySelector<HTMLButtonElement>("button[aria-expanded]");
  if (toggle && toggle.getAttribute("aria-expanded") === "false") toggle.click();

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // preventScroll: the scroll above decides where the row lands, smoothly;
  // focus() on its own would jump there first.
  (toggle ?? row).focus({ preventScroll: true });
  return true;
}
