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

export function aiToFindings(aiFindings: AiFinding[]): AccessibilityFinding[] {
  return aiFindings.map((f) => ({
    id: randomUUID(),
    source: "ai-review" as const,
    severity: f.severity,
    category: f.category,
    wcagCriterion: f.category === "accessibility" ? (f.wcagCriterion ?? "N/A") : undefined,
    selector: f.selector,
    title: f.title ? stripScreenshotReferences(f.title) : undefined,
    description: stripScreenshotReferences(f.description),
    suggestedFix: stripScreenshotReferences(f.suggestedFix),
    confidence: f.confidence,
  }));
}

export function mergeFindings(
  automated: AccessibilityFinding[],
  aiReview: AccessibilityFinding[]
): AccessibilityFinding[] {
  // v1: concatenate. Dedup between layers is primarily handled upstream by
  // instructing Claude to skip axe-covered selectors (see buildPrompt.ts).
  return [...automated, ...aiReview];
}
