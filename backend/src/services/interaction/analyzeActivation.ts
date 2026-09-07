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
  // The failure this can prove: the thing the control governs visibly
  // reacted to the activation while the announced state did not move. A
  // screen reader user is then told the old state in front of the new one.
  //
  // <summary> is excluded because the browser owns its open flag: a native
  // details element cannot lie about it.
  const stale = activation.results.filter(
    (r) => r.tag !== "summary" && r.domChanged && r.before === r.after
  );
  if (stale.length === 0) return [];

  // One card per state family. A page's switches lying is one decision made
  // once in a component, and a page's disclosures lying is another — but a
  // reader told "aria-expanded stayed false" about a switch would go looking
  // for an attribute that is not there.
  const FAMILIES: Array<{ state: string; noun: string; fix: string }> = [
    {
      state: "aria-expanded",
      noun: "disclosure",
      fix: 'Update aria-expanded in the same handler that opens and closes the panel: "true" while it is open, "false" while it is not. The attribute is the announcement; the panel alone is invisible to a listener.',
    },
    {
      state: "aria-pressed",
      noun: "toggle button",
      fix: 'Update aria-pressed in the handler that changes the button\'s state: "true" while it is on, "false" while it is off. The styling shows the state to people who can see it; the attribute is the only thing a listener gets.',
    },
    {
      state: "aria-checked",
      noun: "switch",
      fix: 'Update aria-checked in the handler that flips the control: "true" when on, "false" when off. Without it a screen reader announces the same state whichever way the control is set.',
    },
  ];

  const findings: AccessibilityFinding[] = [];
  for (const family of FAMILIES) {
    const group = stale.filter((r) => r.stateName === family.state);
    if (group.length === 0) continue;
    const worst = group[0];
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "serious",
      category: "accessibility",
      wcagCriterion: "4.1.2",
      wcagLevel: "A",
      ruleId: "activation-stale-state",
      selector: worst.selector,
      description: `${group.length === 1 ? `A ${family.noun} was` : `${group.length} ${family.noun}s were`} activated by the scan and visibly changed. But ${family.state} stayed "${worst.before}". A screen reader keeps announcing the old state, so the listener is told the opposite of what is on screen.`,
      suggestedFix: family.fix,
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    });
  }
  return findings;
}
