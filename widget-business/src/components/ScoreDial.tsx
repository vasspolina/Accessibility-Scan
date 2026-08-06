/**
 * The score dial, brought across from the kit.
 *
 * Everything here is arranged around one idea: the dial is a picture of a
 * number, so it is announced once, as a sentence, and every part of the
 * drawing is hidden.
 *
 * role="img" with an aria-label carrying the whole thing — "Accessibility
 * score: 62 out of 100, Failing". The ring, the numeral and the word beneath
 * are each aria-hidden, because all three repeat what that label says. Left
 * visible, a screen reader would read the number, then the verdict, then the
 * label containing both.
 *
 * The verdict word is not decoration either. The ring's colour says the same
 * thing, and colour cannot say it alone — this report files that against
 * other sites, so the word is the second channel and has to stay.
 *
 * The thresholds are the kit's: 90 and 70. They are duplicated in the
 * report's own copy elsewhere, which is worth knowing but not worth
 * unifying here — moving them would change what the widget says, and this
 * change is meant to move the component without moving the meaning.
 */
export function ScoreDial({
  score = 0,
  label = "Accessibility score",
  size = 120,
}: {
  score?: number;
  label?: string;
  size?: number;
}) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const tone =
    score >= 90
      ? "var(--severity-pass, #0e6027)"
      : score >= 70
        ? "var(--severity-moderate, #8a3800)"
        : "var(--severity-critical, #a2191f)";
  const word = score >= 90 ? "Good" : score >= 70 ? "Needs work" : "Failing";

  return (
    <div className="a11y-dial" role="img" aria-label={`${label}: ${score} out of 100 — ${word}`}>
      <div className="a11y-dial-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border-subtle, #e0e0e0)"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="6"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="a11y-dial-number" aria-hidden="true">
          {score}
        </div>
      </div>
      <span className="a11y-dial-word" aria-hidden="true" style={{ color: tone }}>
        {word}
      </span>
    </div>
  );
}
