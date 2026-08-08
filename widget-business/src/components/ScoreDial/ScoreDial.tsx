/**
 * The score, ported from components/scan/ScoreDial.jsx.
 *
 * Everything here is arranged around one idea, and it is the same idea both
 * the previous version and the source already had: the dial is a picture of
 * a number, so it is announced once, as a sentence, and every part of the
 * drawing is hidden.
 *
 * role="img" with an aria-label carrying the whole thing — "Accessibility
 * score: 62 out of 100 — Failing". The numeral, the band pill, the meter and
 * the scale beneath it are each aria-hidden, because all of them repeat what
 * that label says. Left visible, a screen reader would read the number, then
 * the verdict, then a label containing both.
 *
 * The verdict word is not decoration. The meter's colour says the same
 * thing, and colour cannot say it alone — this report files that against
 * other sites — so the word stays as the second channel.
 *
 * The thresholds are 90 and 70, unchanged from both the previous version and
 * the source. They are duplicated in the report's own copy elsewhere, which
 * is worth knowing and not worth unifying here: moving them would change
 * what the widget says, and this change is meant to move the drawing without
 * moving the meaning.
 *
 * ScoreDial.css is not imported here; see src/styles/components.css.
 */

type Band = "good" | "needs-work" | "failing";

/** The source's bands, in its own order — first match wins. */
const BANDS: Array<{ min: number; band: Band; word: string }> = [
  { min: 90, band: "good", word: "Good" },
  { min: 70, band: "needs-work", word: "Needs work" },
  { min: 0, band: "failing", word: "Failing" },
];

export function ScoreDial({
  score = 0,
  label = "Accessibility score",
}: {
  score?: number;
  label?: string;
  /** Accepted and ignored: the previous ring was sized by this, and the card
   *  sizes itself. Kept so the one call site needs no edit, and typed so a
   *  future one is not misled into thinking it does something. */
  size?: number;
}) {
  const { band, word } = BANDS.find((b) => score >= b.min) ?? BANDS[2];
  /* Clamped for the drawing only — a score outside 0–100 would otherwise
     paint a bar wider than its track. The label still reports the real
     number, because hiding a bad value is how it survives. */
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="a11y-dial" role="img" aria-label={`${label}: ${score} out of 100 — ${word}`}>
      <span className="a11y-dial-word" data-band={band} aria-hidden="true">
        {word}
      </span>
      <div className="a11y-dial-card">
        <div className="a11y-dial-head" aria-hidden="true">
          <strong>{label}</strong>
          <span>Scored out of 100</span>
        </div>
        <div aria-hidden="true">
          <div className="a11y-dial-number">
            <b>{score}</b>
            <span>/100</span>
          </div>
          <div className="a11y-dial-meter">
            <div className="a11y-dial-fill" data-band={band} style={{ width: `${pct}%` }} />
            {/* The thresholds, at the positions they actually sit at. */}
            <div className="a11y-dial-tick" style={{ left: "70%" }} />
            <div className="a11y-dial-tick" style={{ left: "90%" }} />
          </div>
          <div className="a11y-dial-scale">
            <span>Needs work at 70 · Good at 90</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
