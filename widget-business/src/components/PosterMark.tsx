/**
 * The page's word, spread across the full width one letter at a time, the
 * way the Mesma + Acme sheet spreads "MESMA + ACME" along its top edge and
 * "MADRID" along its foot (user's reference, 9 Nov 2026; from 14 Oct 2026
 * the word was set as a tilted arrow, after the symposium poster). Each
 * letter is its own flex item, so justify-content spaces them edge to
 * edge at any width; a word space becomes the sheet's "+". Decoration
 * only: the word is already on the page (the heading it repeats, or the
 * meta line the foot repeats), so the mark is hidden from assistive
 * technology and nothing is read twice. The geometry is in the stylesheet.
 */
export function PosterMark({ word, foot = false }: { word: string; foot?: boolean }) {
  const letters = Array.from(word.trim());
  return (
    <div className={foot ? "a11y-poster a11y-poster-foot" : "a11y-poster"} aria-hidden="true">
      {letters.map((ch, i) => (
        <span key={i} className="a11y-poster-letter">
          {ch === " " ? "+" : ch}
        </span>
      ))}
    </div>
  );
}
