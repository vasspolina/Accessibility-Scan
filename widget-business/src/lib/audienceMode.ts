import type { AccessibilityFinding } from "../api/scanClient";
import { fixKindForFinding } from "./testMethod";

/**
 * Who the report is being rendered for. A presentation flag only: the scan
 * runs identically in both modes, the report object is fetched once, and
 * flipping the mode re-renders what is already in hand — never a re-scan.
 */
export type AudienceMode = "business" | "professional";

const STORAGE_KEY = "a11y-audience-mode";

/**
 * The remembered mode, defaulting to business — the larger audience and the
 * safer default: a professional shown plain language loses nothing, a shop
 * owner shown selectors closes the tab.
 *
 * Storage is injected so tests need no browser, and every touch is guarded:
 * private windows and blocked storage must cost the preference, never the
 * report.
 */
export function loadAudienceMode(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): AudienceMode {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw === "professional" ? "professional" : "business";
  } catch {
    return "business";
  }
}

export function saveAudienceMode(
  mode: AudienceMode,
  storage: Pick<Storage, "setItem"> | undefined = safeStorage()
): void {
  try {
    storage?.setItem(STORAGE_KEY, mode);
  } catch {
    // Blocked storage loses the preference, nothing else.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The EN 301 549 clause for a WCAG 2.1 criterion, or null where the claim
 * cannot honestly be made.
 *
 * Chapter 9 of EN 301 549 maps one-to-one onto WCAG 2.1's A and AA criteria:
 * clause 9.1.4.3 is 1.4.3, mechanically. That is the whole derivation, and
 * also its limit — AAA criteria are not in the standard's chapter 9, and a
 * finding with no criterion has no clause. Returning null there is the point:
 * an EN clause printed against a AAA advisory would claim a legal anchor the
 * standard does not provide.
 */
export function enClauseFor(wcagCriterion: string | undefined, wcagLevel?: string): string | null {
  if (!wcagCriterion || wcagLevel === "AAA") return null;
  const m = wcagCriterion.match(/^(\d\.\d+\.\d+)/);
  if (!m) return null;
  return `EN 301 549 · 9.${m[1]}`;
}

/** The professional-mode view filter. "code" absorbs the rare document kind. */
export type FixFilter = "all" | "design" | "code" | "content";

/**
 * Partitions findings for the professional filter chips, on top of the
 * existing fix-kind mapping — which is already total (everything unmapped is
 * code by construction) and already tested, so there is no "unmapped rule"
 * case to log: the prompt's default-to-code rule is this mapping's identity.
 */
export function matchesFixFilter(finding: AccessibilityFinding, filter: FixFilter): boolean {
  if (filter === "all") return true;
  const kind = fixKindForFinding(finding).key;
  if (filter === "code") return kind === "code" || kind === "document";
  return kind === filter;
}
