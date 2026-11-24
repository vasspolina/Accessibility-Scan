import { ScoreDial } from "./ScoreDial";
import { t, tf } from "../lib/strings";
import { getLang } from "../lib/i18n";
import { useState } from "react";
import { SeverityTag } from "./SeverityTag";
import type { AccessibilityFinding } from "../api/scanClient";
import { groupFindings } from "./FindingsList";
import { plainForRule } from "../lib/wcagPlain";
import { Card } from "./Card";
import { openFinding } from "../lib/openFinding";
import { METHOD_LINE } from "../lib/testMethod";
import { useReportView } from "./ReportViewContext";

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
  // One plain line per band, said beside the number as what that range
  // means for visitors (user's copy, 24 Nov 2026, for the band under 70;
  // the other two follow its form). It names the range itself, so the
  // band needs no label of its own.
  good: ["A score of 90 or more means the scan found little to fix."],
  middling: ["A score from 70 to 89 means some visitors may struggle with parts of your site."],
  poor: ["A score below 70 means some visitors may be unable to use parts of your site."],
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
/* How the score works, three paragraphs in the user's words (24 Nov
   2026), true to scoreFindings
   (backend/src/services/merge/scoring.ts), which is the one place that
   knows. axe's best-practice rules count with no criterion at all. What is
   left out is what scoreFindings and summarizeSeverity leave out: design
   notes, dark patterns, AAA, WCAG 2.2-only criteria, and since 22 Nov 2026
   every AI review finding (they counted when their criterion survived the
   allow-list, which billed one repair twice when the model retold a rule's
   finding). computeScore caps each severity's
   penalty, which is why the second point exists. English keys; the screen and the plain-text summary render them through
   t(), the email stays English for now. Keep
   backend/src/services/mail/sendReport.ts in step. */
export const SCORE_POINTS = [
  "Issues cost points based on their impact on visitors. Each severity level has a maximum deduction.",
  "The score excludes design notes, misleading patterns, AAA checks, WCAG 2.2 checks and AI findings.",
  "A scan finds roughly a third to half of accessibility issues. A person needs to check for other barriers and verify AI findings. The score alone can't establish legal compliance.",
];

/* A heading in the plain-text summary takes a colon, and French sets a
   no-break space before it. */
function asHeading(text: string): string {
  return `${text}${getLang() === "fr" ? "\u00a0:" : ":"}`;
}

/* The same words for the plain-text summary – one source, so the copied
   text and the screen can never disagree about what the score means. A
   heading and one point a line, as in the email: run together, "It" in the
   first sentence read as the last issue in the list above it. A function,
   not a constant, so it is in the reader's language at the moment of
   copying. */
export function scoreCaveatLines(): string[] {
  return [asHeading(t("How the score works")), ...SCORE_POINTS.map((p) => `- ${t(p)}`)];
}

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
  const lang = getLang();
  const scannedAt = new Date(seed).toLocaleDateString(lang === "en" ? "en-GB" : lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines = [
    tf("Accessibility scan: {url}", { url }),
    tf("Scanned {date}", { date: scannedAt }),
    "",
    tf("Score: {score}/100", { score }),
    t(scoreSummary(score, seed)),
    "",
  ];
  if (grouped.length === 0) {
    lines.push(t("Nothing here needs a fix."));
  } else {
    lines.push(asHeading(t("Findings, most severe first")));
    for (const group of grouped) {
      const rep = group[0];
      const plain = plainForRule(rep.ruleId);
      const title = plain?.plain ?? rep.title ?? rep.description;
      const count = group.length > 1 ? ` (${group.length}×)` : "";
      lines.push(`- [${t(SEVERITY_LABEL[rep.severity])}] ${title}${count}`);
    }
  }
  lines.push("", ...scoreCaveatLines());
  return lines.join("\n");
}

/* The report's lead: the first repair, said as what was found, then "Fix
 * this first" (reviewer's note, 22 Nov 2026: "lead the report with a
 * finding such as Two fields are missing labels. Fix these first.").
 *
 * The group is the first in the schedule's own order (groupFindings: most
 * severe, then most widespread), so the lead and the list below never
 * disagree about what comes first. A group here is ONE fault with N
 * instances, keyed on the rule, so fixing it settles all N: the claim is
 * true by construction.
 *
 * Measured findings only. An AI card is the model's view and needs a person
 * to confirm it; it does not get to open the report. A report whose only
 * findings are the model's opens on the score, as before.
 *
 * It replaced the key's "Start here" column (which named the most
 * widespread serious fault), so the report says where to start once.
 */
export function computeFirstFix(
  findings: AccessibilityFinding[]
): { id: string; what: string; count: number } | null {
  // A banner that hides the page from screen readers has its own stop-press
  // ("Start here: a screen reader can't get past your cookie banner"), which
  // outranks every other fault. Two places saying where to start would name
  // two different things.
  if (findings.some((f) => f.ruleId === "consent-blocks-reader")) return null;
  const group = groupFindings(findings).find((g) => g[0].source !== "ai-review");
  if (!group) return null;
  const rep = group[0];
  const count = group.length;
  const plain = plainForRule(rep.ruleId);
  // The rule's own count sentence where it has one ("2 form fields are not
  // joined to a label in the code."), its first sentence only.
  const found = plain?.found?.(count).match(/^.*?[.!?](?=\s|$)/)?.[0];
  const title = (plain?.plain ?? rep.title ?? rep.description).trim().replace(/[.!?]$/, "");
  const what = found ?? (count > 1 ? `${title} (${count}\u00d7).` : `${title}.`);
  return { id: rep.id, what, count };
}

/* Best-practice rules with no numbered criterion arrive as the literal
   "WCAG (see rule help)": not a criterion, so treated as none. */
function criterionOf(rep: AccessibilityFinding): string | null {
  return rep.wcagCriterion && rep.wcagCriterion !== "N/A"
    ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? null)
    : null;
}

/* The band as its range, not an adjective: "middling" told a reader
   nothing about where the line sat (user's question, 26 Aug 2026). */
const BAND_WORD = (score: number) =>
  score >= 90 ? "90 or more" : score >= 70 ? "70 to 89" : "under 70";

/* The dial's arc. r=42 in a 100-unit viewBox, so the circumference is
   2·π·42 = 263.89 — the design's own "15.8 248.1" dash for a score of 6 is
   that same arithmetic, and computing it keeps every OTHER score honest
   rather than only the one the template happened to draw. */
const DIAL_R = 42;
const DIAL_C = 2 * Math.PI * DIAL_R;

export function ScoreGauge({
  score,
  seed,
  findings,
  url,
  allFindings,
  total,
  tookSeconds,
  onSeeFindings,
  warning,
}: {
  score: number;
  /* Checks that did not finish, said as the key's third column beside
     Score … and What the score counts (user's instruction, 24 Nov 2026,
     "combine in 3 columns"): it qualifies the score, so it stands with
     the key rather than in a bubble under it. */
  warning?: { title: string; subtitle: string };
  /* Takes the reader to the findings schedule: the round sticker on the
     dial. Left out in the conversation, where the findings follow. */
  onSeeFindings?: () => void;
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
  const { inChat } = useReportView();
  const [copied, setCopied] = useState(false);
  const grouped = groupFindings(findings);
  const preview = grouped.slice(0, PREVIEW_LIMIT);
  /* The same answer the report-actions panel gets, from the same shared
     helper — computing it twice would be two places to disagree. */
  const first = computeFirstFix(findings);
  const firstId = inChat ? "a11y-first-fix-heading-chat" : "a11y-first-fix-heading";
  const countsId = inChat ? "a11y-sum-counts-heading-chat" : "a11y-sum-counts-heading";
  const warningId = inChat ? "a11y-sum-warning-heading-chat" : "a11y-sum-warning-heading";
  const issuesId = inChat ? "a11y-sum-issues-heading-chat" : "a11y-sum-issues-heading";
  const showWcag = preview.some((group) => criterionOf(group[0]));

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
      {/* The first repair leads, before the number (reviewer's note, 22 Nov
          2026: "Once I have a report, the first thing I see is my score").
          The sentence goes to the finding in the schedule; the line under
          it says how the claim was established. */}
      {first && (
        <section className="a11y-first-fix" aria-labelledby={firstId}>
          <h2 className="a11y-first-fix-label" id={firstId}>{t("Start here")}</h2>
          <p className="a11y-first-fix-lead">
            <a
              href={`#a11y-finding-${first.id}`}
              onClick={(e) => {
                e.preventDefault();
                openFinding(e.currentTarget, first.id);
              }}
            >
              {first.what} {first.count > 1 ? t("Fix these first.") : t("Fix this first.")}
            </a>
          </p>
          <p className="a11y-first-fix-how">{t(METHOD_LINE.automated)}</p>
        </section>
      )}
      {/* Professional mode gets an explicit results header in this slot
          (App.tsx); business mode had none, which left heading navigation
          with no way to jump straight to the score at all. */}
      <h2
        className="a11y-section-title"
        id="a11y-score-heading"
        data-nav-label={t("Score")}
      >
        {t("Your score")}
      </h2>

      {/* The score as plain text on the page (user's instruction and copy,
          24 Nov 2026, replacing the grey panel and its tiles): the dial
          with what its range means beside it, the issues as a table, then
          how the score works. Each part is a label in the first of four
          tracks and its content across the other three, under a 1px rule.
          No panel and no pills; the severity keeps its badge because it is
          the status. */}
      <div className="a11y-sum-grid">
        <section className="a11y-sum-run" aria-labelledby="a11y-sum-run-heading">
          <h3 className="a11y-sr-only" id="a11y-sum-run-heading">{t("Scan summary")}</h3>

          <div className="a11y-sum-dial-card">
            {/* One label carries the whole thing, and every part of the
                drawing is hidden: the arc and the numeral repeat it. */}
            <div
              className="a11y-sum-dial"
              role="img"
              aria-label={
                tookSeconds != null
                  ? tf("Score {score} out of 100, {band}. Issues found: {count}, in {seconds} seconds.", {
                      score,
                      band: t(BAND_WORD(score)),
                      count: total,
                      seconds: tookSeconds,
                    })
                  : tf("Score {score} out of 100, {band}. Issues found: {count}.", {
                      score,
                      band: t(BAND_WORD(score)),
                      count: total,
                    })
              }
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
                <span className="a11y-sum-dial-of">{t("out of 100")}</span>
              </span>
            </div>
            {/* The round sticker on the dial (user's instruction, 23 Nov
                2026): a call to act, a real button after the dial in the
                markup. Left out in the conversation, where the findings
                follow. */}
            {onSeeFindings && !inChat && findings.length > 0 && (
              <button type="button" className="a11y-dial-sticker" onClick={onSeeFindings}>
                <span className="a11y-dial-sticker-words">
                  {findings.length === 1 ? t("See the finding") : tf("See the {count} findings", { count: findings.length })}
                </span>
              </button>
            )}
          </div>

          {/* What the range means, beside the number it explains. */}
          <p className="a11y-sum-verdict">{t(scoreSummary(score, seed))}</p>
        </section>

        {preview.length === 0 ? (
          <p className="a11y-score-clean">{t("Nothing here needs a fix.")}</p>
        ) : (
          <section className="a11y-sum-issues" aria-labelledby={issuesId}>
            <h3 className="a11y-sum-label" id={issuesId}>
              {findings.length === 1 ? t("1 issue found") : tf("{count} issues found", { count: findings.length })}
            </h3>
            <table className="a11y-sum-table">
              <thead>
                <tr>
                  {/* No visible column titles over the issues (user's
                      instruction, 24 Nov 2026, "delete priority issue"):
                      the badge says the priority. Kept for screen readers. */}
                  <th scope="col"><span className="a11y-sr-only">{t("Issue")}</span></th>
                  {/* A column empty in every row is left out, header and
                      all, as in the findings tables. */}
                  {showWcag && <th scope="col">WCAG</th>}
                </tr>
              </thead>
              <tbody>
                {preview.map((group) => {
                  const rep = group[0];
                  const title = plainForRule(rep.ruleId)?.plain ?? rep.title ?? rep.description;
                  return (
                    <tr key={rep.id}>
                      <td className="a11y-sum-table-issue">
                        {/* The badge on top of the title (user's
                            instruction, 24 Nov 2026), then the link to the
                            finding in the schedule, which covers the whole
                            row, so the whole line is what you press. */}
                        <span className="a11y-sum-table-badge">
                          <SeverityTag severity={rep.severity} label={t(SEVERITY_LABEL[rep.severity])} />
                        </span>
                        <a
                          href={`#a11y-finding-${rep.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            openFinding(e.currentTarget, rep.id);
                          }}
                        >
                          {title}
                        </a>
                        {group.length > 1 && (
                          <span className="a11y-sum-table-count"> {tf("{count} places", { count: group.length })}</span>
                        )}
                      </td>
                      {showWcag && <td className="a11y-sum-table-wcag">{criterionOf(rep) ?? ""}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Plain text, not the report's own HTML: the point is to leave the
            widget entirely, an email or a message to whoever owns the fix. */}
        {!inChat && (
          <div className="a11y-sum-actions">
            <button type="button" className="a11y-show-all a11y-score-copy" onClick={copySummary}>
              {copied ? t("Copied") : t("Copy summary as plain text")}
            </button>
            <span className="a11y-sr-only" role="status">
              {copied ? t("Summary copied to the clipboard.") : ""}
            </span>
          </div>
        )}

        <section className="a11y-sum-counts" aria-labelledby={countsId}>
          <h3 className="a11y-sum-label" id={countsId}>{t("How the score works")}</h3>
          {SCORE_POINTS.map((point) => (
            <p key={point} className="a11y-sum-point">{t(point)}</p>
          ))}
        </section>

        {/* Checks that did not finish qualify the score, so they stand with
            how it works: the warning's badge as the label, its two lines
            as the content. A status, so it waits its turn to be read. */}
        {warning && (
          <section className="a11y-sum-warning" role="status" aria-labelledby={warningId}>
            <h3 className="a11y-sum-label" id={warningId}>
              <span className="a11y-sum-warning-badge">{t("Warning")}</span>
            </h3>
            <div className="a11y-sum-warning-text">
              <p>{warning.title}</p>
              <p>{warning.subtitle}</p>
            </div>
          </section>
        )}
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
