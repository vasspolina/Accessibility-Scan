import { ScoreDial } from "./ScoreDial";
import { t, tf } from "../lib/strings";
import { getLang } from "../lib/i18n";
import { useState } from "react";
import type { ReactNode } from "react";
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
  // One plain line per band. The rotating quips this replaced read as
  // slogans, and a verdict about somebody's site is not the place for one:
  // it says what the scan found and what that does not cover, then stops.
  good: ["Little to fix. A person would still find more."],
  middling: ["What the scan found stops some visitors. Most get through."],
  poor: ["What the scan found keeps people from using the site."],
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
/* What the score counts, in the words of scoreFindings
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
  "The problems this scan found, weighted by what each costs a visitor.",
  "Each severity has a limit on how far it lowers the score.",
  "Design notes, misleading patterns, AAA and WCAG 2.2 checks do not count.",
  "AI review findings do not count. A person has to check them.",
  "A scan finds a third to a half of the problems. The rest need a person.",
  "It does not say the site meets the law.",
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
  return [asHeading(t("What the score counts")), ...SCORE_POINTS.map((p) => `- ${t(p)}`)];
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
  onSeeFindings,
}: {
  score: number;
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

      {/* The design's scan-summary template: the run and its worst findings,
          then three titled panels. Ported from
          templates/scan-summary/Summary.jsx in the design project — read
          from there rather than from a screenshot, which is how the arc
          arithmetic and every token below are the design's own. The scan
          summary (its heading, the dial, the top three) comes first, straight
          under the title (user's instruction, 4 Nov 2026): it was the
          design's right column, and with the columns stacked it sat below
          the three panels. */}
      <div className="a11y-sum-grid">
        <div className="a11y-sum-col">
          <section className="a11y-sum-run" aria-labelledby="a11y-sum-run-heading">
            <h3 className="a11y-sr-only" id="a11y-sum-run-heading">{t("Scan summary")}</h3>

            <div className="a11y-sum-dial-card">
              {/* One label carries the whole thing, and every part of the
                  drawing is hidden — the arc, the numeral and the pills all
                  repeat it. Announced once, as a sentence. */}
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
                  2026, "add element like this to related content", "on the
                  score dial", with a reference of a big tilted circle over
                  a picture): a call to act rather than a verdict, since the
                  band is said once in the key below. A real button after
                  the dial in the markup; the tilt is the words' only. */}
              {onSeeFindings && !inChat && findings.length > 0 && (
                <button type="button" className="a11y-dial-sticker" onClick={onSeeFindings}>
                  <span className="a11y-dial-sticker-words">
                    {findings.length === 1 ? t("See the finding") : tf("See the {count} findings", { count: findings.length })}
                  </span>
                </button>
              )}
            </div>

            {/* The run of the worst findings, centred at display size under
                the dial, in the conversation as on the page. It was left out
                of the chat on 20 Nov 2026 ("file a report in chat like an
                assistant would do") and is back since 21 Nov 2026 (user's
                instruction, "the designed centered text under score is
                gone, bring it back"). */}
            {preview.length === 0 ? (
              <p className="a11y-score-clean">{t("Nothing here needs a fix.")}</p>
            ) : (
              <div className="a11y-sum-table">
                <div className="a11y-sum-thead" aria-hidden="true">
                  <span className="a11y-sum-cell-no">{t("No.")}</span>
                  <span className="a11y-sum-cell-item">{t("Item")}</span>
                  <span className="a11y-sum-cell-count">{t("Instances")}</span>
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
                        {/* The whole item is a link to its finding in the
                            schedule below (user's instruction, 17 Nov 2026).
                            A link and not a button: it goes somewhere, and
                            a button cannot wrap across lines of display type. */}
                        <a
                          className="a11y-sum-row-link"
                          href={`#a11y-finding-${rep.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            openFinding(e.currentTarget, rep.id);
                          }}
                        >
                        <span className="a11y-sum-cell-item">
                          {/* The round marker is held to the title's first
                              word, so a wrap never strands it at a line end. */}
                          <span className="a11y-sum-row-title">
                            <span className="a11y-sum-nobreak">
                              <span className="a11y-sum-cell-no" aria-hidden="true">{i + 1}</span>
                              {title.split(" ")[0]}
                            </span>
                            {title.includes(" ") ? ` ${title.slice(title.indexOf(" ") + 1)}` : ""}
                          </span>
                          <span className="a11y-sum-row-marks">
                            {criterion && (
                              <span className="a11y-sum-chip">WCAG {criterion}</span>
                            )}
                            <SeverityTag
                              severity={rep.severity}
                              label={t(SEVERITY_LABEL[rep.severity])}
                            />
                          </span>
                        </span>
                        <span className="a11y-sum-cell-count">
                          {group.length}&#8202;&times;
                        </span>
                        </a>
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
        </div>

        {/* The key: the band and what the score counts, side by side under
            one rule, each a label over its lines (user's reference, 22 Nov
            2026, a type foundry's footer). Start here left it the same day
            for the lead above the score. */}
        <div className="a11y-sum-col a11y-sum-key">
          <SumPanel title={tf("Score {band}", { band: t(BAND_WORD(score)) })}>
            {/* No second line: points 05 and 06 under "What the score counts"
                already say what a scan reaches and what needs a person. */}
            <p className="a11y-sum-lead">{t(scoreSummary(score, seed))}</p>
          </SumPanel>

          {/* The six points are the key's last and widest column, a plain
              list of lines, in the conversation as on the page (user's
              reference, 22 Nov 2026, a type foundry's footer). They were
              folded under their title in the chat, and numbered ruled
              columns on the page. The chat's copy takes its own id, since
              the report can be on the page and in the thread at once. */}
          <section className="a11y-sum-panel a11y-sum-counts" aria-labelledby={countsId}>
            <h3 className="a11y-sum-eyebrow" id={countsId}>{t("What the score counts")}</h3>
            <ul className="a11y-sum-counts-list" role="list">
              {SCORE_POINTS.map((point) => (
                <li key={point}>{t(point)}</li>
              ))}
            </ul>
          </section>
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
