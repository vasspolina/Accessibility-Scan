import { ScoreDial } from "./ScoreDial";
import { t } from "../lib/strings";
import { useState } from "react";
import type { ReactNode } from "react";
import { SeverityTag } from "./SeverityTag";
import type { AccessibilityFinding } from "../api/scanClient";
import { groupFindings } from "./FindingsList";
import { plainForRule } from "../lib/wcagPlain";
import { Card } from "./Card";

/* The stat tiles ARE the Card component's anatomy — layer-01 fill, subtle
   hairline, 2px corner, 16px padding — so they use it rather than a div
   whose CSS restated the same inline styles. Card takes no className, so
   the flex layout rides in `style`, which is how the kit's own screens
   compose it. One quiet win: Card reads --layer-01, already bridged and
   scheme-aware, which retires the hardcoded #262626 dark overrides these
   tiles used to need. */
const SEVERITY_LABEL: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
};

// How many groups the preview beside the dial shows before the full list
// further down the report takes over. Three matches what a reader can
// scan in the time it takes to look at the dial next to it.
const PREVIEW_LIMIT = 3;

// Each line states a judgement and stops. The number above has already made
// the point, and a sentence that softens it reads as an apology for the
// measurement.
//
// The register is British deadpan: understatement, mock formality, the
// occasional absurd comparison delivered perfectly straight. One rule holds
// across all of it, and it is not negotiable. The joke is always at the
// expense of the design, or of the comfortable assumption behind it. It is
// never at the expense of the people the site turns away, who are the reason
// any of this exists and are not a punchline.
//
// The top band carries a second constraint. A scan reaches perhaps half of
// what is wrong, so "faultless" and "nobody is turned away" were claims this
// tool is not entitled to make on the evidence it has. The good lines say what
// was looked for and found clean, and stop there.
export const SUMMARIES: Record<"good" | "middling" | "poor", string[]> = {
  good: [
    "Well built. What remains is craft, not repair.",
    "Close to right. What's left is finish work, not repair.",
    "Nothing left that a machine can find. Not the same as nothing left.",
    "A good site. We had a whole speech prepared.",
    "Few doors left closed. A scan cannot see all of them.",
  ],
  middling: [
    "Adequate for most. Design is judged by the rest.",
    "Broadly fine. Broadly carries a lot of weight there.",
    "Mostly accessible, the way a bridge is mostly finished.",
    "Works for most people. The others also have money.",
    "Built for the average visitor. No such person has ever visited.",
  ],
  poor: [
    "This shuts people out. Not deliberately, but by design.",
    "It works perfectly, provided you can see and click.",
    "Barriers throughout. To call them features would be brave.",
    "Not one problem. A committee of them.",
    "The door is locked. Nobody remembers who chose the lock.",
  ],
};

/**
 * Picks one line for this report.
 *
 * Deterministic on the scan timestamp rather than random, and that matters:
 * Math.random() here would deal a new verdict on every React re-render, so the
 * headline would change each time someone expanded a finding. Keyed this way
 * it is fixed for a given report and different for the next one.
 */
export function scoreSummary(score: number, seed: string): string {
  const band = score >= 90 ? "good" : score >= 70 ? "middling" : "poor";
  const lines = SUMMARIES[band];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(hash) % lines.length];
}

/* The score caveat is a honesty fixture — single-sourced so the business
   card and the professional summary can never drift apart on what the
   number means. */
/* The five things a reader has to know about the number, as five things
   rather than as one paragraph.

   It was a five-sentence block sitting under the score, which is the worst
   place in the report for dense prose: it is the first thing anybody reads,
   and every sentence in it is a separate fact that changes what the number
   means. Split, each one can be taken in on its own — and the last two, the
   ones that stop somebody quoting 87 as proof of compliance, stop being the
   tail of a paragraph nobody finished. */
export const SCORE_POINTS = [
  "It counts what an automated scan can prove, weighted by how much each problem costs a visitor.",
  "A scan of this kind reaches somewhere between a third and a half of accessibility problems.",
  "The rest need a person with a keyboard and a screen reader.",
  "It is useful for tracking whether the site improves over time.",
  "It is not a statement that the site meets the law.",
];

/* The same words as one string, for the plain-text summary — one source, so
   the copied text and the screen can never disagree about what the score
   means. */
export const SCORE_CAVEAT = SCORE_POINTS.join(" ");

// A plain-text version of the same verdict, for pasting into an email or
// a message to whoever owns the fix — no HTML, no table, nothing that
// depends on this widget's own rendering to make sense. groupFindings and
// SEVERITY_LABEL are the same ones the score preview above uses, so the
// two can never say something different about the same finding.
export function buildPlainSummary({
  url,
  seed,
  score,
  allFindings,
}: {
  url: string;
  seed: string;
  score: number;
  allFindings: AccessibilityFinding[];
}): string {
  const grouped = groupFindings(allFindings);
  const scannedAt = new Date(seed).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines = [
    `Accessibility scan: ${url}`,
    `Scanned ${scannedAt}`,
    "",
    `Score: ${score}/100`,
    scoreSummary(score, seed),
    "",
  ];
  if (grouped.length === 0) {
    lines.push("Nothing found that needs a fix.");
  } else {
    lines.push("Issues found, most severe first:");
    for (const group of grouped) {
      const rep = group[0];
      const plain = plainForRule(rep.ruleId);
      const title = plain?.plain ?? rep.title ?? rep.description;
      const count = group.length > 1 ? ` (${group.length}×)` : "";
      lines.push(`- [${SEVERITY_LABEL[rep.severity]}] ${title}${count}`);
    }
  }
  lines.push("", SCORE_CAVEAT);
  return lines.join("\n");
}

/* "Do this first" — the one fix that settles the most at once.
 *
 * From ui_kits/scan-app/checker.prompt.md: "Anti-pattern: opening on a list
 * of 34 findings with no order of attack. Correct: the band states what one
 * fix settles."
 *
 * The claim has to be provable, because this report's own rule is that a
 * statement is unhedged only when it is true by construction. It is: a
 * group here is ONE fault with N instances — groupFindings keys on ruleId —
 * so fixing it does resolve all N. That is a weaker claim than the design's
 * "the shared header", which groups by component and needs selector
 * analysis in the scanner; this one needs nothing the widget does not
 * already have, and it does not overstate.
 *
 * Only critical and serious count. "Do this first" is advice about order of
 * attack, and a minor issue is never the thing to do first however many
 * times it occurs.
 *
 * Exported because the report-actions panel renders it now and ScoreGauge
 * still needs the same answer — computing it twice from the same findings
 * would be two places for the two to drift apart.
 */
export function computeDoFirst(
  findings: AccessibilityFinding[]
): { title: string; settles: number; outOf: number } | null {
  const worstFirst = groupFindings(findings).filter(
    (g) => g[0].severity === "critical" || g[0].severity === "serious"
  );
  const topGroup =
    worstFirst.length > 0
      ? worstFirst.reduce((a, b) => (b.length > a.length ? b : a))
      : null;
  /* Suppressed at one instance, deliberately. "Fixing this settles 1 of 1"
   * is noise, and the anti-pattern the band exists to prevent — a list with
   * no order of attack — does not arise when there is one thing to do. */
  if (!topGroup || topGroup.length <= 1) return null;
  return {
    title: plainForRule(topGroup[0].ruleId)?.plain ?? topGroup[0].title ?? "",
    settles: topGroup.length,
    outOf: worstFirst.reduce((n, g) => n + g.length, 0),
  };
}

/* The second line under the verdict. The evocative line varies by band and
   by scan — scoreSummary picks from a set — while this one never does,
   because it is the qualification rather than the mood. */
const VERDICT_CAVEAT =
  "A scan proves what a machine can see. The rest needs someone to sit down with the site.";

const BAND_WORD = (score: number) =>
  score >= 90 ? "good" : score >= 70 ? "middling" : "failing";

/* The dial's arc. r=42 in a 100-unit viewBox, so the circumference is
   2·π·42 = 263.89 — the design's own "15.8 248.1" dash for a score of 6 is
   that same arithmetic, and computing it keeps every OTHER score honest
   rather than only the one the template happened to draw. */
const DIAL_R = 42;
const DIAL_C = 2 * Math.PI * DIAL_R;

/* A titled purple panel wrapping a white card — the design's repeated left
   column unit. The eyebrow is an h3 rather than a styled span so the three
   panels are reachable as headings. */
function SumPanel({
  title,
  grow = false,
  children,
}: {
  title: string;
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`a11y-sum-panel${grow ? " a11y-sum-grow" : ""}`}>
      <h3 className="a11y-sum-eyebrow">{title}</h3>
      <div className="a11y-sum-card">{children}</div>
    </section>
  );
}

export function ScoreGauge({
  score,
  seed,
  findings,
  url,
  allFindings,
  total,
  tookSeconds,
}: {
  score: number;
  /* For the run pills beside the dial: how many issues, and how long it
     took. Both come from the report rather than being recounted here. */
  total: number;
  tookSeconds: number | null;
  // The scan timestamp. Fixes which line this report gets, so it stays put
  // across re-renders and changes for the next scan.
  seed: string;
  // The accessibility-category findings, for the preview beside the dial.
  // The full, expandable list further down the report is still the one
  // source of truth — this is a glance at what it holds, not a second
  // copy of it, so it carries no selector and no disclosure of its own.
  findings: AccessibilityFinding[];
  // For the plain-text copy button: the scanned address, and every
  // category of finding (not just accessibility) — a summary meant to be
  // pasted to a colleague undersells the report if it silently drops the
  // dark-pattern and design-clarity findings the page below still shows.
  url: string;
  allFindings: AccessibilityFinding[];
}) {
  const [copied, setCopied] = useState(false);
  const grouped = groupFindings(findings);
  const preview = grouped.slice(0, PREVIEW_LIMIT);
  /* The same answer the report-actions panel gets, from the same shared
     helper — computing it twice would be two places to disagree. */
  const doFirst = computeDoFirst(findings);

  /* "Do this first" — the one fix that settles the most at once.
   *
   * From ui_kits/scan-app/checker.prompt.md: "Anti-pattern: opening on a list
   * of 34 findings with no order of attack. Correct: the band states what one
   * fix settles."
   *
   * The claim has to be provable, because this report's own rule is that a
   * statement is unhedged only when it is true by construction. It is: a
   * group here is ONE fault with N instances — groupFindings keys on ruleId —
   * so fixing it does resolve all N. That is a weaker claim than the design's
   * "the shared header", which groups by component and needs selector
   * analysis in the scanner; this one needs nothing the widget does not
   * already have, and it does not overstate.
   *
   * Only critical and serious count. "Do this first" is advice about order of
   * attack, and a minor issue is never the thing to do first however many
   * times it occurs.
   */

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildPlainSummary({ url, seed, score, allFindings }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing to fall back to here since this
      // button has no visible text field the way the statement's does;
      // failure is silent rather than throwing.
    }
  }
  return (
    <div className="a11y-score">
      {/* Professional mode gets an explicit results header in this slot
          (App.tsx); business mode had none, which left heading navigation
          with no way to jump straight to the score at all. */}
      <h2 className="a11y-section-title" id="a11y-score-heading" data-nav-label={t("Score")}>{t("Your score")}</h2>

      {/* The design's scan-summary template: three titled panels down the
          left, the run and its worst findings on the right. Ported from
          templates/scan-summary/Summary.jsx in the design project — read
          from there rather than from a screenshot, which is how the arc
          arithmetic and every token below are the design's own. */}
      <div className="a11y-sum-grid">
        <div className="a11y-sum-col">
          {doFirst && (
            <SumPanel title="Do this first">
              <p className="a11y-sum-lead">
                Fixing {doFirst.title.toLowerCase()} settles {doFirst.settles} of
                the {doFirst.outOf} most serious findings at once.
              </p>
            </SumPanel>
          )}

          <SumPanel title={`What a ${BAND_WORD(score)} score means`}>
            <p className="a11y-sum-lead">{scoreSummary(score, seed)}</p>
            <p className="a11y-sum-body">{VERDICT_CAVEAT}</p>
          </SumPanel>

          <SumPanel title="What the score counts" grow>
            {SCORE_POINTS.map((point, i) => (
              <p key={point} className="a11y-sum-point">
                <span className="a11y-sum-point-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{point}</span>
              </p>
            ))}
          </SumPanel>
        </div>

        <div className="a11y-sum-col">
          <section className="a11y-sum-run" aria-labelledby="a11y-sum-run-heading">
            <h3 className="a11y-sum-eyebrow" id="a11y-sum-run-heading">Scan summary</h3>
            <p className="a11y-sum-micro">This run</p>

            <div className="a11y-sum-dial-card">
              {/* One label carries the whole thing, and every part of the
                  drawing is hidden — the arc, the numeral and the pills all
                  repeat it. Announced once, as a sentence. */}
              <div
                className="a11y-sum-dial"
                role="img"
                aria-label={`Score ${score} out of 100 — ${BAND_WORD(score)}. ${total} ${
                  total === 1 ? "issue" : "issues"
                } found${tookSeconds != null ? `, in ${tookSeconds} seconds` : ""}.`}
              >
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                  <circle cx="50" cy="50" r={DIAL_R} fill="none"
                    stroke="var(--orange-20)" strokeWidth="9" />
                  <circle cx="50" cy="50" r={DIAL_R} fill="none"
                    stroke="var(--orange-50)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * DIAL_C} ${DIAL_C}`}
                    transform="rotate(-90 50 50)" />
                </svg>
                <span className="a11y-sum-dial-face" aria-hidden="true">
                  <span className="a11y-sum-dial-num">{score}</span>
                  <span className="a11y-sum-dial-of">out of 100</span>
                </span>
              </div>
              <div className="a11y-sum-pills" aria-hidden="true">
                <span className="a11y-sum-pill a11y-sum-pill-band">{scoreBandLabel(score)}</span>
                <span className="a11y-sum-pill">
                  {total} {total === 1 ? "issue" : "issues"}
                </span>
                {tookSeconds != null && (
                  <span className="a11y-sum-pill">{tookSeconds} sec</span>
                )}
              </div>
            </div>

            {preview.length === 0 ? (
              <p className="a11y-score-clean">Nothing here needs a fix.</p>
            ) : (
              <div className="a11y-sum-table">
                <div className="a11y-sum-thead" aria-hidden="true">
                  <span className="a11y-sum-cell-no">No</span>
                  <span className="a11y-sum-cell-item">Item</span>
                  <span className="a11y-sum-cell-count">Instances</span>
                </div>
                <ul className="a11y-sum-rows">
                  {preview.map((group, i) => {
                    const rep = group[0];
                    const plain = plainForRule(rep.ruleId);
                    const title = plain?.plain ?? rep.title ?? rep.description;
                    /* Best-practice rules with no numbered criterion arrive
                       as the literal "WCAG (see rule help)" — not a criterion
                       and not meaningful beside the "WCAG" prefix, so it is
                       treated as having none rather than displayed. */
                    const criterion =
                      rep.wcagCriterion && rep.wcagCriterion !== "N/A"
                        ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? null)
                        : null;
                    return (
                      <li key={rep.id} className="a11y-sum-row">
                        <span className="a11y-sum-cell-no" aria-hidden="true">{i + 1}</span>
                        <span className="a11y-sum-cell-item">
                          <span className="a11y-sum-row-title">{title}</span>
                          <span className="a11y-sum-row-marks">
                            {criterion && (
                              <span className="a11y-sum-chip">WCAG {criterion}</span>
                            )}
                            <SeverityTag
                              severity={rep.severity}
                              label={SEVERITY_LABEL[rep.severity]}
                            />
                          </span>
                        </span>
                        <span className="a11y-sum-cell-count">
                          {group.length}&#8202;&times;
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* Plain text, not the report's own HTML: the point is to leave the
              widget entirely — an email or a Slack message to whoever owns
              the fix, not a screenshot of this card. */}
          <div className="a11y-sum-actions">
            <button type="button" className="a11y-show-all a11y-score-copy" onClick={copySummary}>
              {copied ? "Copied" : "Copy summary as plain text"}
            </button>
            <span className="a11y-sr-only" role="status">
              {copied ? "Summary copied to the clipboard." : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Kept out of the render: the pill says the band in a word, and the same
   thresholds already live in BAND_WORD, so this is the one place that turns
   them into the capitalised label the design shows. */
function scoreBandLabel(score: number): string {
  return score >= 90 ? "Good" : score >= 70 ? "Needs work" : "Failing";
}
