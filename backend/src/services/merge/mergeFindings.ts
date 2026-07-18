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
