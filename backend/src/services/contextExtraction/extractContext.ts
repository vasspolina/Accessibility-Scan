import type { RenderResult } from "../render/renderPage.js";
import { axeTargetToSelector } from "../render/renderPage.js";
import type { Severity } from "../../types/report.js";

export interface PageReviewContext {
  meta: { url: string; pageTitle: string; scannedAt: string };
  headingTree: Array<{ level: number; text: string; selector: string }>;
  landmarks: Array<{ role: string; label: string | null; selector: string }>;
  images: Array<{ selector: string; alt: string | null; src: string }>;
  interactiveElements: Array<{
    type: string;
    selector: string;
    accessibleName: string;
    href?: string;
    hasVisibleText: boolean;
  }>;
  forms: RenderResult["domSignals"]["forms"];
  focusOrderSample: string[];
  animatedElements: RenderResult["domSignals"]["animatedElements"];
  respectsReducedMotion: boolean;
  // Truncated YAML accessibility-tree snapshot (Playwright ariaSnapshot) —
  // complementary cross-check to the hand-extracted fields above.
  ariaSnapshot: string;
  automatedFindingsSummary: {
    totalViolations: number;
    bySeverity: Record<Severity, number>;
    coveredSelectors: string[];
    // Rule id and selector pairs, verbatim — what an age enrichment must name
    // to attach. Without these the model could only guess at pairs, and the
    // exists-guard in applyAgeEnrichments rightly dropped every guess.
    findings: Array<{ ruleId: string; selector: string }>;
  };
}

const impactToSeverity: Record<string, Severity> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

export function buildAutomatedFindingsSummary(axe: RenderResult["axe"]) {
  const bySeverity: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const coveredSelectors = new Set<string>();

  for (const violation of axe.violations) {
    const severity = violation.impact ? impactToSeverity[violation.impact] : undefined;
    for (const node of violation.nodes) {
      if (severity) bySeverity[severity] += 1;
      // A shadow-piercing entry is itself an array — flatten so the covered
      // set holds selector strings, matching what the AI context is built on.
      for (const target of node.target.flat()) coveredSelectors.add(target);
    }
  }

  const totalViolations = Object.values(bySeverity).reduce((a, b) => a + b, 0);

  // Deduplicated and capped: one consent dialog can hold forty rows of the
  // same violation, and the model needs the vocabulary, not the census.
  const findingPairs: Array<{ ruleId: string; selector: string }> = [];
  const seenPairs = new Set<string>();
  for (const violation of axe.violations) {
    for (const node of violation.nodes) {
      const selector = axeTargetToSelector(node.target);
      const key = violation.id + "\u0000" + selector;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      if (findingPairs.length < 40) findingPairs.push({ ruleId: violation.id, selector });
    }
  }

  return {
    totalViolations,
    bySeverity,
    coveredSelectors: Array.from(coveredSelectors),
    findings: findingPairs,
  };
}

/**
 * Builds a compact, purpose-built JSON payload for the AI judgment layer
 * instead of sending raw HTML — cheaper, and it steers Claude toward the
 * accessible-name/structure view rather than re-deriving it from markup.
 */
export function extractContext(url: string, render: RenderResult): PageReviewContext {
  return {
    meta: { url, pageTitle: render.pageTitle, scannedAt: new Date().toISOString() },
    headingTree: render.domSignals.headingTree,
    landmarks: render.domSignals.landmarks,
    images: render.domSignals.images,
    interactiveElements: render.domSignals.interactiveElements,
    forms: render.domSignals.forms,
    focusOrderSample: render.domSignals.focusOrderSample,
    animatedElements: render.domSignals.animatedElements,
    respectsReducedMotion: render.domSignals.respectsReducedMotion,
    ariaSnapshot: render.ariaSnapshot.slice(0, 6000),
    automatedFindingsSummary: buildAutomatedFindingsSummary(render.axe),
  };
}
