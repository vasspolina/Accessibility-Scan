import { createHash } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

/**
 * A finding's identity across scans.
 *
 * Rule plus selector: the same fault on the same element is the same
 * finding, and a page whose sections were re-ordered must not read as a
 * page full of new ones. Hashed so it is one opaque token rather than a
 * selector with pipes in it, and short because it is keyed on in a table
 * and printed in a baseline file.
 *
 * Computed on the server and carried on every finding, so the CLI, the
 * triage table and a future issue-tracker export all agree on what "the
 * same finding" means. It used to be minted at the edge, in the CLI, and an
 * identity minted at the edge cannot be shared with anything else.
 *
 * KNOWN LIMIT, measured: some rules card once for the whole page with the
 * first offender as the selector, so a second offender on that page does
 * not change the fingerprint. The CLI's baseline comparison prints the
 * total for exactly that case.
 */
export function fingerprintFinding(f: Pick<AccessibilityFinding, "ruleId" | "wcagCriterion" | "selector">): string {
  const raw = `${f.ruleId ?? f.wcagCriterion ?? "unknown"}|${f.selector ?? ""}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/** The pre-hash form, kept so baselines written before the hash existed
 *  still match. */
export function legacyFingerprint(f: Pick<AccessibilityFinding, "ruleId" | "wcagCriterion" | "selector">): string {
  return `${f.ruleId ?? f.wcagCriterion ?? "unknown"}|${f.selector ?? ""}`;
}
