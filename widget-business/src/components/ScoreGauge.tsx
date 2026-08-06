import { Card, ScoreDial } from "@verify/design-system";
import { useState, type CSSProperties } from "react";
import { SeverityTag } from "./SeverityTag";
import type { AccessibilityFinding } from "../api/scanClient";
import { groupFindings } from "./FindingsList";
import { plainForRule } from "../lib/wcagPlain";

/* The stat tiles ARE the Card component's anatomy — layer-01 fill, subtle
   hairline, 2px corner, 16px padding — so they use it rather than a div
   whose CSS restated the same inline styles. Card takes no className, so
   the flex layout rides in `style`, which is how the kit's own screens
   compose it. One quiet win: Card reads --layer-01, already bridged and
   scheme-aware, which retires the hardcoded #262626 dark overrides these
   tiles used to need. */
const TILE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 12,
};

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

export function ScoreGauge({
  score,
  seed,
  findings,
  url,
  allFindings,
}: {
  score: number;
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
  const preview = groupFindings(findings).slice(0, PREVIEW_LIMIT);

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
      <h2 className="a11y-section-title" id="a11y-score-heading" data-nav-label="Score">Your score</h2>
      {/* The scan-app dashboard's stat row: the dial in its own labelled
          card, then the worst of what it found beside it — the kit's own
          dial-plus-list composition, in place of a row of count tiles that
          repeated the summary line below without saying what any of it
          actually was. */}
      <div className="a11y-stat-row">
        <Card style={{ ...TILE, background: "transparent" }}>
          <span className="a11y-stat-label">Accessibility score</span>
          <ScoreDial score={score} size={110} />
        </Card>
        <Card style={{ background: "transparent" }}>
          {preview.length === 0 ? (
            <p className="a11y-score-clean">Nothing here needs a fix.</p>
          ) : (
            <ul className="a11y-score-preview">
              {preview.map((group) => {
                const rep = group[0];
                const plain = plainForRule(rep.ruleId);
                const title = plain?.plain ?? rep.title ?? rep.description;
                // Best-practice rules with no numbered criterion arrive as
                // the literal string "WCAG (see rule help)" — not a
                // criterion number, and not meaningful on its own next to
                // the literal "WCAG" prefix below, so it's treated the same
                // as having no criterion at all rather than displayed.
                const criterion =
                  rep.wcagCriterion && rep.wcagCriterion !== "N/A"
                    ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? null)
                    : null;
                return (
                  <li key={rep.id} className="a11y-score-preview-row">
                    <SeverityTag severity={rep.severity} label={SEVERITY_LABEL[rep.severity]} />
                    <span className="a11y-score-preview-desc">
                      {title}
                      {criterion && <span className="a11y-score-preview-meta">WCAG {criterion}</span>}
                    </span>
                    {group.length > 1 && <span className="a11y-count-badge">{group.length}×</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* The kit's callout slot, carrying the line this report has always
          led with. */}
      <p className="a11y-notice a11y-score-callout">{scoreSummary(score, seed)}</p>
      {/* What the number is, next to the number.

          An aggregate score is fine for tracking whether a site is getting
          better and is not a conformance claim, and this one was presented
          without saying so. Automated testing reaches somewhere between a
          third and a half of accessibility problems; the rest needs a person
          with a keyboard and a screen reader. A reader who takes 100 to mean
          "accessible" has been misled by us, not by their own optimism. */}
      <ul className="a11y-score-points">
        {SCORE_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {/* Plain text, not the report's own HTML: the point is to leave the
          widget entirely — an email or a Slack message to whoever owns
          the fix, not a screenshot of this card. */}
      <button type="button" className="a11y-show-all a11y-score-copy" onClick={copySummary}>
        {copied ? "Copied" : "Copy summary as plain text"}
      </button>
      <span className="a11y-sr-only" role="status">
        {copied ? "Summary copied to the clipboard." : ""}
      </span>
    </div>
  );
}
