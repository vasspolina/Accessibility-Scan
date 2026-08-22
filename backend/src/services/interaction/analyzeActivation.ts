import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";
import type { DisclosureActivation } from "../render/renderPage.js";

// 4.1.2's dynamic half: "states, properties and values that can be set by
// the user" have to be SET when the user sets them. Until the activation
// pass existed, no probe ever changed a state, so a control whose visible
// panel opens while its aria-expanded stays "false" — the announced state
// lying about the real one — was unreachable by construction. This is the
// evaluator for what that pass measured.

export function evaluateActivation(
  activation: DisclosureActivation | undefined
): AccessibilityFinding[] {
  if (!activation) return [];
  // The failure this can prove: the page visibly reacted to the activation
  // (the DOM changed) while the announced state did not move. A screen
  // reader user now hears "collapsed" in front of an open panel.
  const stale = activation.results.filter(
    (r) => r.tag !== "summary" && r.domChanged && r.before === r.after
  );
  if (stale.length === 0) return [];
  const worst = stale[0];
  return [
    {
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "4.1.2",
      wcagLevel: "A",
      ruleId: "activation-stale-state",
      selector: worst.selector,
      description: `${stale.length === 1 ? "A disclosure button was" : `${stale.length} disclosure buttons were`} pressed by the scan and the page visibly changed — but aria-expanded stayed "${worst.before}". A screen reader keeps announcing the old state, so the listener hears "collapsed" in front of an open panel.`,
      suggestedFix:
        'Update aria-expanded in the same handler that opens and closes the panel: "true" while it is open, "false" while it is not. The attribute is the announcement; the panel alone is invisible to a listener.',
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    },
  ];
}
