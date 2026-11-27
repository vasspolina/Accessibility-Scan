import type { AccessibilityFinding } from "../api/scanClient";
import { getLang } from "./i18n";
import { plainFixForRule, plainForRule } from "./wcagPlain";

/**
 * The self-hosted model's plain-language rewrite of an axe finding
 * (backend services/plainLanguage/), when it was written in the language
 * the report is being read in. A rewrite in another language is not used:
 * switching the report to German must not leave English cards behind, and
 * the hand-written copy exists in all four.
 *
 * The order is the model's text, then the hand-written rule copy, then
 * axe's own. The model's text speaks about this page's elements, which the
 * rule copy cannot; the rule copy is the fallback wherever the model did
 * not run, did not reach the rule, or wrote another language.
 */
export function modelPlain(f: AccessibilityFinding): AccessibilityFinding["plain"] | undefined {
  return f.plain && f.plain.lang === getLang() ? f.plain : undefined;
}

export function findingTitle(f: AccessibilityFinding): string {
  return modelPlain(f)?.title ?? plainForRule(f.ruleId)?.plain ?? f.title ?? f.description;
}

export function findingFix(f: AccessibilityFinding): string | string[] {
  return modelPlain(f)?.fix ?? plainFixForRule(f.ruleId) ?? f.suggestedFix;
}
