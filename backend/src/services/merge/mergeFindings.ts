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
        elementSnippet: node.html?.slice(0, 300),
        description: violation.help,
        suggestedFix: node.failureSummary ?? violation.description,
        ruleId: violation.id,
      });
    }
  }
  return findings;
}

export function aiToFindings(aiFindings: AiFinding[]): AccessibilityFinding[] {
  return aiFindings.map((f) => ({
    id: randomUUID(),
    source: "ai-review" as const,
    severity: f.severity,
    category: f.category,
    wcagCriterion: f.category === "accessibility" ? (f.wcagCriterion ?? "N/A") : undefined,
    selector: f.selector,
    description: f.description,
    suggestedFix: f.suggestedFix,
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
