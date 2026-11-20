/**
 * The page's word (Findings, New scan) at the top of the page, set as a
 * plain word. From 9 Nov 2026 it was spread across the full width one
 * letter at a time, after the Mesma + Acme sheet, with the scanned host
 * spread the same way along the foot; the user had both taken out on
 * 20 Nov 2026 ("do not space letters like that"; the foot line, "delete").
 * Decoration only: the word is already on the page as the heading it
 * repeats, so the mark is hidden from assistive technology and nothing is
 * read twice.
 */
export function PosterMark({ word }: { word: string }) {
  return (
    <div className="a11y-poster" aria-hidden="true">
      {word.trim()}
    </div>
  );
}
