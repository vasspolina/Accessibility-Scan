import { randomUUID } from "node:crypto";
import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

/**
 * Time limits — WCAG 2.2.1 Timing Adjustable (Level A).
 *
 * Unlike the rest of the interaction layer, this one states a failure rather
 * than asking a question, and it is the only criterion in that batch where
 * the evidence goes that far.
 *
 * A <meta http-equiv="refresh"> with a delay reloads or redirects the page
 * out from under whoever is reading it. The criterion asks that a time limit
 * be turnable off, adjustable, or extendable; this mechanism offers none of
 * the three by construction, so there is no version of it that passes and
 * nothing left to judge. That is what makes it a finding.
 *
 * A zero-second refresh is excluded. It is an immediate redirect — a routing
 * decision, not a time limit anybody experiences, with nothing to extend.
 */
const TIMING_URL = "https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html";

export function evaluateTiming(signals: {
  metaRefreshSeconds: DomSignals["metaRefreshSeconds"];
}): AccessibilityFinding[] {
  const secs = signals.metaRefreshSeconds;
  if (secs === null || secs <= 0) return [];

  return [
    {
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "2.2.1",
      wcagLevel: "A",
      selector: 'meta[http-equiv="refresh"]',
      ruleId: "timing-meta-refresh",
      description:
        `This page reloads itself after ${secs} seconds, and nothing offers a way to stop it. ` +
        "Anyone still reading, filling in the form, or working through it with a screen reader loses their place.",
      suggestedFix:
        "Remove the timed refresh. Where the content really does need to update, offer a button that refreshes it, " +
        "or warn people before it happens and let them add time.",
      helpUrl: TIMING_URL,
    },
  ];
}
