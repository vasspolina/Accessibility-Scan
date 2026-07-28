import type { AccessibilityFinding } from "../api/scanClient";
import type { PlainRule } from "./wcagPlain";

/**
 * The "What we found" line for a card, or null when there is nothing to add.
 *
 * Three sources, in order of how well they read:
 *
 * The rule's own count-aware account, where the rule has one. axe states a
 * requirement rather than a finding — "Links must have discernible text" —
 * which is the wrong grammatical mood under a heading promising what is on
 * this page.
 *
 * Otherwise the finding's own description. This is the case that was missing.
 * The line used to be shown only when a plain-language entry existed, on the
 * reasoning that without one the description was already serving as the
 * card's heading. That holds for axe findings and fails for every AI one:
 * those write a short headline of their own and put the substance in the
 * description. So the substance was pushed into the collapsed technical
 * drawer, and where a finding had neither rule id nor WCAG criterion that
 * drawer never rendered and the description appeared nowhere at all.
 * Measured across sixteen European sites: 32 of 80 AI findings reached the
 * reader as a headline and three badges, with the explanation dropped.
 *
 * And nothing, when the description is already the title. That is the one
 * case where showing it would only repeat the line above it.
 */
export function whatWeFound(
  finding: AccessibilityFinding,
  plain: PlainRule | undefined,
  entryCount: number,
  title: string
): string | null {
  if (plain?.found) return plain.found(entryCount);
  if (finding.description && finding.description !== title) return finding.description;
  return null;
}
