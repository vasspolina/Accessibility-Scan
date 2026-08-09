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

/** The source's bands, in its own order — first match wins.
 *  `from` is where each band starts on the meter, which the fill needs: the
 *  design paints the current band solid from its own start to the score, not
 *  from zero, so the track keeps showing all three bands underneath. */
const BANDS: Array<{ min: number; band: Band; word: string; range: string }> = [
  { min: 90, band: "good", word: "Good", range: "is 90 and up." },
  { min: 70, band: "needs-work", word: "Needs work", range: "is 70 to 89." },
  { min: 0, band: "failing", word: "Failing", range: "is under 70." },
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
  const { band, word, range, min } = BANDS.find((b) => score >= b.min) ?? BANDS[2];
  /* Clamped for the drawing only — a score outside 0–100 would otherwise
     paint a bar wider than its track. The label still reports the real
     number, because hiding a bad value is how it survives. */
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      className="a11y-dial"
      data-band={band}
      role="img"
      aria-label={`${label}: ${score} out of 100 — ${word}`}
    >
      {/* Everything below is aria-hidden and repeats the label above, which is
          the arrangement this component has always had: the drawing is
          announced once, as a sentence.

          The card, the "/100", the meter and the scale are back — they were
          cut against an earlier reference that set the score as a label, a
          number and the word alone. They had also been rendering as
          run-together text ("Accessibility scoreScored out of 100") because
          their children had no rule to separate them, which was a reason to
          write the rules rather than to delete the markup.

          Colour still never carries the verdict alone: the band is a WORD in
          a pill, and the tint underneath only agrees with it. */}
      <div className="a11y-dial-head" aria-hidden="true">
        <span className="a11y-dial-labels">
          <span className="a11y-dial-label">{label}</span>
          <span className="a11y-dial-sub">Scored out of 100</span>
        </span>
        <span className="a11y-dial-band">{word}</span>
      </div>

      <p className="a11y-dial-figure" aria-hidden="true">
        <span className="a11y-dial-number">{score}</span>
        <span className="a11y-dial-of">/100</span>
      </p>

      {/* The track shows all three bands; the solid run and the tick show
          where this score sits inside its own. */}
      <div className="a11y-dial-meter" aria-hidden="true">
        <span
          className="a11y-dial-meter-fill"
          style={{ left: `${min}%`, width: `${Math.max(0, pct - min)}%` }}
        />
        <span className="a11y-dial-meter-tick" style={{ left: `${pct}%` }} />
      </div>
      <p className="a11y-dial-scale" aria-hidden="true">
        <span>0</span>
        <span>100</span>
      </p>

      <p className="a11y-dial-note" aria-hidden="true">
        <strong>{word}</strong> {range}
        {band !== "good" && " Good starts at 90."}
      </p>
    </div>
  );
}
