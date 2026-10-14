/**
 * The page's word, set as an arrow: one word along the shaft, one on each
 * stroke of the head, all tilted, as on the symposium poster this layout
 * comes from (14 Oct 2026). Decoration only: the heading it repeats is
 * already on the page, so the whole mark is hidden from assistive
 * technology and nothing is read twice. The geometry is in the stylesheet.
 */
export function PosterMark({ word }: { word: string }) {
  return (
    <div className="a11y-poster" aria-hidden="true">
      <span className="a11y-poster-word a11y-poster-shaft">
        {word} <span className="a11y-poster-more">{word}</span>
      </span>
      <span className="a11y-poster-word a11y-poster-head-up">{word}</span>
      <span className="a11y-poster-word a11y-poster-head-down">{word}</span>
    </div>
  );
}
