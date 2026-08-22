import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";
import type { AxeRunResult } from "../render/renderPage.js";
import { axeTargetToSelector } from "../render/renderPage.js";

// Contrast findings from the states the main axe run never sees: the page's
// own dark theme, and the phone-width layout. One card per state — a palette
// that fails in dark mode is one decision, made once in the tokens — and
// only for elements the desktop-light run did not already card, because the
// same bad colour pair failing everywhere is still one fault.

function selectorsOf(violations: AxeRunResult["violations"], ruleId: string): Set<string> {
  const out = new Set<string>();
  for (const v of violations) {
    if (v.id !== ruleId) continue;
    for (const n of v.nodes) out.add(axeTargetToSelector(n.target));
  }
  return out;
}

export function evaluateSchemeContrast(opts: {
  light: AxeRunResult;
  dark?: AxeRunResult["violations"];
  mobile?: AxeRunResult["violations"];
}): AccessibilityFinding[] {
  const lightSelectors = selectorsOf(opts.light.violations, "color-contrast");
  const findings: AccessibilityFinding[] = [];

  const card = (
    violations: AxeRunResult["violations"] | undefined,
    ruleId: string,
    where: string,
    fix: string
  ) => {
    if (!violations) return;
    const fresh: string[] = [];
    for (const v of violations) {
      if (v.id !== "color-contrast") continue;
      for (const n of v.nodes) {
        const sel = axeTargetToSelector(n.target);
        if (!lightSelectors.has(sel)) fresh.push(sel);
      }
    }
    if (fresh.length === 0) return;
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "1.4.3",
      wcagLevel: "AA",
      ruleId,
      selector: fresh[0],
      description: `${fresh.length === 1 ? "One piece of text falls" : `${fresh.length} pieces of text fall`} below the required contrast ${where} — and nowhere else, so the desktop check alone missed ${fresh.length === 1 ? "it" : "all of them"}.`,
      suggestedFix: fix,
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
    });
  };

  card(
    opts.dark,
    "color-contrast-dark",
    "in the page's dark theme",
    "Check the dark palette's text and background tokens the same way as the light ones: ordinary text needs 4.5 to 1 against what it sits on, in both themes."
  );
  card(
    opts.mobile,
    "color-contrast-mobile",
    "at phone width",
    "A breakpoint swaps in a colour pairing the desktop layout never uses. Check the styles inside the phone-width media queries against the same 4.5 to 1 rule."
  );
  return findings;
}
