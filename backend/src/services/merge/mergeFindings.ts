import { randomUUID } from "node:crypto";
import type { AxeRunResult } from "../render/renderPage.js";
import { axeTargetToSelector } from "../render/renderPage.js";
import type { AccessibilityFinding, AiFinding, Severity } from "../../types/report.js";
import { suggestAccessibleForeground } from "../contrast/suggestAccessibleColour.js";

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

/**
 * Reads the colour pair out of an axe color-contrast node and works out a
 * colour that would pass.
 *
 * Reporting "1.96:1, needs 4.5:1" states a fact and leaves the reader to solve
 * it, and the person reading this report is usually not the person who chose
 * the colour. A hex they can paste is the difference between a report and a
 * fix. Best-effort throughout: anything unexpected in the shape of the data
 * means no suggestion, never a wrong one.
 */
function contrastSuggestionFor(node: {
  any?: Array<{ id: string; data?: unknown }>;
}): AccessibilityFinding["suggestedColour"] {
  const check = node.any?.find((a) => a.id === "color-contrast");
  const data = check?.data as
    | { fgColor?: string; bgColor?: string; expectedContrastRatio?: string }
    | undefined;
  if (!data?.fgColor || !data.bgColor) return undefined;
  // "4.5:1" — the bar depends on text size and weight, and axe has already
  // worked that out, so take its answer rather than recomputing it.
  const required = Number.parseFloat(String(data.expectedContrastRatio ?? "4.5"));
  if (!Number.isFinite(required) || required <= 1) return undefined;
  const suggestion = suggestAccessibleForeground(data.fgColor, data.bgColor, required);
  if (!suggestion) return undefined;
  return {
    from: suggestion.from,
    to: suggestion.to,
    background: data.bgColor,
    ratio: suggestion.ratio,
    required: suggestion.required,
  };
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
        selector: axeTargetToSelector(node.target),
        elementSnippet: compactHtml(node.html, 300),
        description: violation.help,
        suggestedFix: node.failureSummary ?? violation.description,
        ruleId: violation.id,
        helpUrl: violation.helpUrl,
        ...(violation.id === "color-contrast"
          ? { suggestedColour: contrastSuggestionFor(node) }
          : {}),
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
// The model writes in English and quotes the page's own buttons, so these have
// to survive a Dutch label inside an English sentence: "the popup offers
// 'Accepteren' as a solid button". \b(accept)\b does not match inside
// "Accepteren" — there is no word boundary after "accept" — so on
// stedelijk.nl the reconciliation below silently did nothing and the reader
// got the measured finding and the model's retelling of it, side by side.
//
// Stems rather than whole words, and the same alphabets the consent detector
// learned to read. \p{L}* takes the ending off the caller's hands: "accept"
// covers Accepteren and accepting alike.
const edge = (body: string) => new RegExp(`(?<!\\p{L})(?:${body})\\p{L}*`, "iu");
const CONSENT_PAIR_RE = edge(
  "accept|agree|allow|akzeptier|zustimm|einverstand|accetta|aceptar|aceitar|" +
    "godk\u00e4nn|tillad|zgadzam|zezw|toestaan|akkoord"
);
const CONSENT_REFUSE_RE = edge(
  "reject|declin|refus|deny|opt[- ]?out|necessary only|only necessary|" +
    "ablehn|verweiger|weiger|afwijz|noodzakelijk|rifiut|rechaz|recus|rejeit|" +
    "odrzu|avvis|neka|afvis"
);
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


/**
 * The age layer's framing rules, enforced rather than hoped for.
 *
 * The prompt forbids describing older visitors as a single struggling group,
 * and prompt instructions set direction without enforcing invariants — the
 * lesson this codebase has now paid for six times. Text that names "elderly
 * users", "seniors", "old people", calls anyone senile, or prescribes a
 * simplified or senior variant is dropped here, whatever the instructions
 * said. Applied to age enrichment notes, where this vocabulary would appear.
 */
const FORBIDDEN_AGE_FRAMING =
  /\b(the elderly|elderly (users?|people|visitors?)|seniors?\b(?!ority)|old people|senile|(senior|simplified|lite|basic) (version|variant|mode|site))\b/i;

/**
 * Attaches the model's age-inclusive notes to the automated findings they
 * describe. One sentence on how an already-proved fault lands for visitors
 * past sixty — enrichment of a measured finding, never a finding of its own,
 * which is what keeps the note from double-counting the fault.
 *
 * Deterministic guards, since every instruction here is only a request:
 * a note must name a finding that exists (rule id and selector both), must
 * survive the framing filter, and one note per finding — the first wins.
 */
export function applyAgeEnrichments(
  findings: AccessibilityFinding[],
  enrichments: Array<{ ruleId: string; selector: string; ageNote: string }>
): { received: number; attached: number } {
  const noted = new Set<string>();
  for (const e of enrichments) {
    if (FORBIDDEN_AGE_FRAMING.test(e.ageNote)) continue;
    const key = `${e.ruleId}\u0000${e.selector}`;
    if (noted.has(key)) continue;
    const target = findings.find(
      (f) => f.source === "automated" && f.ruleId === e.ruleId && f.selector === e.selector
    );
    if (!target) continue;
    noted.add(key);
    const note = e.ageNote.trim().replace(/\.?$/, ".");
    target.description = `${target.description} ${note}`;
  }
  return { received: enrichments.length, attached: noted.size };
}

/**
 * Drops AI dark-pattern findings that repeat a consent problem we measured.
 *
 * The sibling above handles the model contradicting the measurement. This
 * handles it agreeing, which reads worse in a report than it sounds: on
 * bundesregierung.de the reader got two serious cards side by side, "Accepting
 * cookies is one click, declining takes several" and "Your cookie banner lets
 * people accept in one click, but the only way to refuse is to go into a
 * settings screen first". One problem, counted twice, inflating the count the
 * whole score is built on.
 *
 * The measured finding wins. It was proved rather than judged, it carries the
 * photograph of the banner, and its wording is the wording this project
 * settled on. The model's version goes.
 *
 * Scoped to the accept/refuse pair on purpose. Everything else the model
 * notices about a banner survives -- corriere.it's count of 1196 third
 * parties, a refusal that quietly means "subscribe" -- because those are
 * things no rule here measures, and dropping them would cost the report the
 * only layer that could have caught them.
 */
export function dropDuplicateConsentClaims(
  aiFindings: AccessibilityFinding[],
  measured: readonly AccessibilityFinding[]
): AccessibilityFinding[] {
  const alreadyProved = measured.some(
    (f) => f.ruleId === "dark-consent-no-reject" || f.ruleId === "dark-consent-asymmetry"
  );
  if (!alreadyProved) return aiFindings;

  return aiFindings.filter((f) => {
    if (f.category !== "dark-pattern") return true;
    const text = `${f.title ?? ""} ${f.description} ${f.suggestedFix}`;
    return !(CONSENT_PAIR_RE.test(text) && CONSENT_REFUSE_RE.test(text));
  });
}

/**
 * Drops the findings the model itself was not sure of.
 *
 * Every AI finding carries a confidence the model assigns, and until now that
 * value travelled all the way into the report and was never read. A guess and
 * a certainty were printed identically, which is the overclaim this project
 * refuses everywhere it can measure — applied to the one layer that cannot be
 * measured at all.
 *
 * Two things go:
 *
 * Low confidence, on the model's own word. If it is not sure, the owner
 * should not be reading it as a fault on their site.
 *
 * And any claim hedged in the title, whatever confidence came with it.
 * "Cookie banner's close icon may not equal rejecting cookies" asserts
 * nothing: it is a thought, not a finding, and it arrived labelled the same
 * as a measured contrast failure. A title is the claim, and a claim that has
 * to say "may" has not been established.
 *
 * The description may still hedge — some genuine faults are conditional, and
 * a sentence explaining "if this is what the button does, then…" is honest
 * where a headline of the same shape is not.
 *
 * Pure and deterministic. Exported for testing.
 */
const HEDGED_CLAIM = /\b(may|might|could|possibly|perhaps|potentially|seems?|appears?)\b/i;

/**
 * Claims about where content came from, which the model cannot establish.
 *
 * Observed on moma.org: "AI-written image captions describe colours, not the
 * artwork", and "Another AI-generated caption misses the artwork's name". The
 * defect is real and worth reporting — the captions do describe colours
 * rather than the paintings. Who wrote them is a guess from style, and the
 * report has no way to know whether a person, a tool or a model produced any
 * text on the page.
 *
 * It also puts an accusation in front of the owner that they may simply have
 * to deny, which is a poor use of the one sentence they read.
 */
const UNVERIFIABLE_ORIGIN =
  /\b(ai[- ](written|generated)|auto[- ]generated|machine[- ]generated|written by (a|an) (ai|model|bot))\b/i;

/**
 * A title leaning on another finding rather than standing by itself.
 *
 * "Another AI-generated caption misses the artwork's name" only parses if you
 * have read a previous card, and the report groups, sorts and filters
 * findings — so there is no previous card guaranteed to be there. Each one is
 * read alone, and has to make sense alone.
 */
const REFERS_TO_ANOTHER = /^(another|also|additionally|likewise|similarly)\b/i;

export function dropSpeculativeFindings(findings: AccessibilityFinding[]): AccessibilityFinding[] {
  return findings.filter((f) => {
    if (f.source !== "ai-review") return true;
    if (f.confidence === "low") return false;
    const title = f.title ?? "";
    if (HEDGED_CLAIM.test(title)) return false;
    if (UNVERIFIABLE_ORIGIN.test(title)) return false;
    return !REFERS_TO_ANOTHER.test(title.trim());
  });
}
