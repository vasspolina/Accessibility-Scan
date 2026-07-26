import { randomUUID } from "node:crypto";
import type { AxeRunResult } from "../render/renderPage.js";
import type { AccessibilityFinding, AiFinding, Severity } from "../../types/report.js";

const impactToSeverity: Record<string, Severity> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

function wcagTagsToLabel(tags: string[]): string {
  const scTag = tags.find((t) => /^wcag\d{3,4}$/.test(t));
  if (scTag) {
    const digits = scTag.replace("wcag", "");
    return `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
  }
  const wcagTags = tags.filter((t) => t.startsWith("wcag"));
  return wcagTags.length > 0 ? wcagTags.join(", ") : "WCAG (see rule help)";
}

// Verified against the installed axe-core package — this is the complete,
// closed set of WCAG-level tags it emits (no wcag22a or wcag2x-aaa variants
// exist beyond wcag2aaa). A whitelist rather than a regex so an unexpected
// future tag never silently gets misclassified.
const LEVEL_TAGS: Record<"A" | "AA" | "AAA", string[]> = {
  AAA: ["wcag2aaa"],
  AA: ["wcag2aa", "wcag21aa", "wcag22aa"],
  A: ["wcag2a", "wcag21a"],
};

// ~30 axe rules (landmark-one-main, empty-heading, etc.) are tagged
// "best-practice" with no numbered WCAG criterion and no level tag at all —
// wcagTagsToLabel already falls back to "WCAG (see rule help)" for these,
// and this correctly returns undefined for them too (verified: no axe rule
// carries a level tag without also carrying a numbered SC tag).
export function wcagLevelFromTags(tags: string[]): "A" | "AA" | "AAA" | undefined {
  // Highest level wins when a rule carries tags from multiple WCAG versions
  // at once (e.g. both wcag2aa and wcag22aa) — if it's AA under any version,
  // it's AA for conformance-messaging purposes.
  if (tags.some((t) => LEVEL_TAGS.AAA.includes(t))) return "AAA";
  if (tags.some((t) => LEVEL_TAGS.AA.includes(t))) return "AA";
  if (tags.some((t) => LEVEL_TAGS.A.includes(t))) return "A";
  return undefined;
}

// Drops class/style/data-* attributes before truncating an element's HTML.
// On a utility-CSS site one class attribute runs to hundreds of characters, so
// a raw slice keeps the noise and discards what actually identifies the
// element — its accessible name, href, and text. Without this, distinct
// elements all reduce to a generic "Button"/"Link" in the report (and then
// collapse into a single row, hiding how many there really are).
export function compactHtml(html: string | undefined, max: number): string | undefined {
  if (!html) return undefined;
  const compacted = html
    .replace(/\s+(class|style)\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+(class|style)\s*=\s*'[^']*'/gi, "")
    .replace(/\s+data-[\w-]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+data-[\w-]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return compacted.slice(0, max);
}

export function axeToFindings(axe: AxeRunResult): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  for (const violation of axe.violations) {
    const severity = violation.impact ? impactToSeverity[violation.impact] : "minor";
    for (const node of violation.nodes) {
      findings.push({
        id: randomUUID(),
        source: "automated",
        severity,
        category: "accessibility",
        wcagCriterion: wcagTagsToLabel(violation.tags),
        wcagLevel: wcagLevelFromTags(violation.tags),
        selector: node.target.join(" "),
        elementSnippet: compactHtml(node.html, 300),
        description: violation.help,
        suggestedFix: node.failureSummary ?? violation.description,
        ruleId: violation.id,
        helpUrl: violation.helpUrl,
      });
    }
  }
  return findings;
}

/**
 * Removes references to "the screenshot" from AI-written prose. The model is
 * shown a screenshot; the site owner reading the report is not, so a phrase
 * like "(see screenshot: huge black text cuts across the photo)" points at
 * something that isn't on their screen. The system prompt asks for locations
 * described in page terms instead — this is the safety net for the ones that
 * slip through, since a prompt is guidance, not a guarantee.
 *
 * Exported for testing.
 */
export function stripScreenshotReferences(text: string): string {
  return (
    text
      // A whole parenthetical about the screenshot — drop it entirely.
      .replace(/\s*\([^()]*screenshots?[^()]*\)/gi, "")
      // Lead-ins that turn the sentence into a caption.
      .replace(/\b(?:the |this )?screenshot shows (?:that )?/gi, "")
      .replace(/\bas (?:can be )?seen in the screenshot\b/gi, "")
      .replace(/\b(?:visible|shown|seen) in the screenshot\b/gi, "")
      .replace(/\b(?:in|from|per|see) the screenshot\b/gi, "")
      .replace(/\bsee screenshot\b/gi, "")
      // Tidy the punctuation the removals leave behind.
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/[,;:]\s*([.!?])/g, "$1")
      .replace(/\s+—\s*([.!?])/g, "$1")
      .replace(/\(\s*\)/g, "")
      .trim()
  );
}

/**
 * Replaces long dashes in AI-written prose.
 *
 * House style is short declarative sentences; an em dash is usually a splice
 * holding two of them together. A full stop is nearly always the better
 * choice, so a dash joining two clauses becomes one, and a dash introducing a
 * short trailing phrase becomes a comma (a full stop there would leave a
 * fragment).
 *
 * Done in code as well as in the prompt because prompt instructions have not
 * held reliably in this codebase — see the heading-severity floor and the
 * screenshot-reference stripper for the same pattern.
 *
 * Exported for testing.
 */
export function replaceLongDashes(text: string): string {
  return (
    text
      // Spaced dash: decide by what follows. Four or more words reads as a
      // clause and takes a full stop; anything shorter is a trailing phrase
      // and takes a comma.
      .replace(/\s+[—–]\s+(\S+(?:\s+\S+)*?)(?=$|[.!?])/g, (_m, rest: string) => {
        const words = rest.trim().split(/\s+/);
        if (words.length >= 4) {
          return `. ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
        }
        return `, ${rest}`;
      })
      // Any dash left (unspaced, or mid-clause) becomes a comma rather than
      // being deleted, which would run two words together.
      .replace(/\s*[—–]\s*/g, ", ")
      // Tidy what the substitutions can leave behind.
      .replace(/,\s*,/g, ",")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

export function aiToFindings(aiFindings: AiFinding[]): AccessibilityFinding[] {
  return aiFindings.map((f) => ({
    id: randomUUID(),
    source: "ai-review" as const,
    severity: f.severity,
    category: f.category,
    wcagCriterion: f.category === "accessibility" ? (f.wcagCriterion ?? "N/A") : undefined,
    selector: f.selector,
    title: f.title ? replaceLongDashes(stripScreenshotReferences(f.title)) : undefined,
    description: replaceLongDashes(stripScreenshotReferences(f.description)),
    suggestedFix: replaceLongDashes(stripScreenshotReferences(f.suggestedFix)),
    confidence: f.confidence,
  }));
}

// axe rules that are precisely about heading structure. An exact set rather
// than a pattern: keying off WCAG 1.3.1 would sweep in tables, lists and form
// labels, which are a different problem with a different severity.
const HEADING_RULE_IDS = new Set([
  "empty-heading",
  "heading-order",
  "p-as-heading",
  "page-has-heading-one",
]);

// A table's column/row headers are also called "headings" but are a separate
// concern — they don't carry page navigation, so they must not be caught by
// the text match below.
const TABLE_HEADING = /\b(table|column|row)\s+heading/i;
const HEADING_WORD = /\bheadings?\b/i;

function isHeadingStructureFinding(finding: AccessibilityFinding): boolean {
  if (finding.category !== "accessibility") return false;
  if (finding.ruleId && HEADING_RULE_IDS.has(finding.ruleId)) return true;
  // AI findings carry no rule id, so fall back to what they say.
  if (finding.source !== "ai-review") return false;
  const text = `${finding.title ?? ""} ${finding.description}`;
  return HEADING_WORD.test(text) && !TABLE_HEADING.test(text);
}

/**
 * Raises heading-structure findings to at least "serious".
 *
 * 71.6% of screen-reader users navigate a long page by its headings first —
 * 78% among advanced users — against 13.6% who use find and 4.8% who use links
 * (WebAIM Screen Reader User Survey #10). A broken heading structure therefore
 * removes the primary means of navigation for most of these users, which is
 * not a moderate problem.
 *
 * The system prompt already says this, but a prompt is guidance rather than a
 * guarantee: live runs came back rating heading findings "moderate" anyway.
 * Enforcing it here makes the weighting deterministic, and applies it to axe
 * findings too (axe rates heading-order "moderate" by its own scale), so the
 * two sources can't disagree about the same problem.
 *
 * Only ever raises severity. A finding the AI judged critical stays critical.
 *
 * Exported for testing.
 */
export function applyHeadingSeverityFloor(
  findings: AccessibilityFinding[]
): AccessibilityFinding[] {
  return findings.map((finding) => {
    if (!isHeadingStructureFinding(finding)) return finding;
    if (finding.severity === "critical" || finding.severity === "serious") return finding;
    return { ...finding, severity: "serious" as const };
  });
}

export function mergeFindings(
  automated: AccessibilityFinding[],
  aiReview: AccessibilityFinding[]
): AccessibilityFinding[] {
  // v1: concatenate. Dedup between layers is primarily handled upstream by
  // instructing Claude to skip axe-covered selectors (see buildPrompt.ts).
  return applyHeadingSeverityFloor([...automated, ...aiReview]);
}

// Claims about consent-button styling that the page's own measurements
// contradict. Matches a finding that is about the accept/reject pair AND about
// how they look — not merely a finding that mentions a cookie banner.
const CONSENT_PAIR_RE = /\b(accept|agree|allow)\b/i;
const CONSENT_REFUSE_RE = /\b(reject|decline|refuse|opt[- ]?out|necessary only)\b/i;
const APPEARANCE_RE =
  /\b(identical|indistinguish\w*|same (?:size|style|colour|color|weight|appearance)|look\w* (?:the same|alike|similar|visually)|visually (?:identical|similar|the same)|styl\w+|prominen\w+|visual weight|stand\s?out)\b/i;

/**
 * Drops AI dark-pattern findings that say the consent buttons are wrongly
 * styled when we measured them and they are not.
 *
 * The prompt already tells the model that equal visual weight is the correct
 * end state — Art. 7 requires refusing to be as easy as accepting — and it
 * still produced "accept and reject look visually identical, but only one is
 * a real choice" for a banner whose buttons match. That is the rule inverted:
 * matching buttons are the fix, not the fault, and telling an owner to make
 * one stand out would walk them into the actual dark pattern.
 *
 * The deterministic layer already computes this from the live DOM (see
 * dark-consent-asymmetry). Where measurement and model disagree about
 * something measurable, measurement wins.
 *
 * Pure and deterministic. Exported for testing.
 */
export function dropContradictedConsentClaims(
  findings: AccessibilityFinding[],
  consentBanner: {
    acceptControls: Array<{ prominent: boolean }>;
    rejectControls: Array<{ prominent: boolean }>;
  } | null
): AccessibilityFinding[] {
  // No banner, or no pair to compare, means nothing was measured — leave the
  // model's judgement alone rather than silencing it on no evidence.
  if (!consentBanner) return findings;
  const { acceptControls, rejectControls } = consentBanner;
  if (acceptControls.length === 0 || rejectControls.length === 0) return findings;

  // The same test dark-consent-asymmetry uses, so the two can never disagree.
  const asymmetric =
    acceptControls.some((c) => c.prominent) && rejectControls.every((c) => !c.prominent);
  if (asymmetric) return findings;

  return findings.filter((f) => {
    if (f.source !== "ai-review" || f.category !== "dark-pattern") return true;
    const text = `${f.title ?? ""} ${f.description} ${f.suggestedFix}`;
    const aboutThePair = CONSENT_PAIR_RE.test(text) && CONSENT_REFUSE_RE.test(text);
    return !(aboutThePair && APPEARANCE_RE.test(text));
  });
}
