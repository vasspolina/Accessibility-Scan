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
      {/* Everything below is aria-hidden and repeats the label above, which is
          the arrangement this component has always had: the drawing is
          announced once, as a sentence.

          The card, the "/100" line, the meter and the 70/90 scale are gone —
          the reference sets the score as a label, a number and the verdict
          word, and nothing else. Two of those four were also rendering as
          run-together text ("Accessibility scoreScored out of 100", "Good at
          90100") because their two children had no rule to separate them.

          Colour moved off the number and onto the word. The number stays ink
          at 16.4:1; the word carries the band, and it is a WORD, so the result
          never depends on hue. */}
      <span className="a11y-dial-label" aria-hidden="true">{label}</span>
      <p className="a11y-dial-figure" aria-hidden="true">
        <span className="a11y-dial-number">{score}</span>
        <span className="a11y-dial-word" data-band={band}>{word}</span>
      </p>
    </div>
  );
}
