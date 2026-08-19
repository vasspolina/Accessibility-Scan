import { randomUUID } from "node:crypto";
import type { AccessibilityFinding, AccessibilityReport } from "../../types/report.js";
import type { DarkPatternSignals } from "../darkPatterns/analyzeDarkPatterns.js";

/**
 * What a consent banner does to a screen reader — evaluated from the facts
 * the render pass measured beside the banner itself.
 *
 * An EU-site sweep (18 Aug 2026, sixteen major sites) found two distinct
 * failure shapes, and they get opposite treatment here because only one of
 * them is provable:
 *
 *   1. The layer aria-hides the whole page while keyboard focus never
 *      enters the layer. A screen reader user hears silence where the page
 *      should be and cannot find the banner to clear it. Measured on
 *      booking.com: 98% of the page's text hidden, focus outside. That is a
 *      finding — content and controls exposed to no assistive technology is
 *      a failure of the accessibility contract the page's code makes
 *      (WCAG 4.1.2 territory), and it is mechanically demonstrated.
 *
 *   2. The layer never introduces itself: no dialog role, no accessible
 *      name, focus never arrives — or focus is trapped inside a nameless
 *      group. Six of eleven measured banners. Real harm, but NOT a provable
 *      A/AA violation: a non-modal banner div is legal markup. Those go to
 *      the undecided ledger, where this report puts what it saw but cannot
 *      rule on. They never move the score.
 *
 * Main-frame banners only. A banner inside a cross-origin consent iframe
 * (Sourcepoint and friends) cannot be probed from the host page, and its
 * measurements would describe the iframe's own document — saying nothing
 * would be more honest than saying that.
 */

const DIALOG_PATTERN_URL = "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/";

/** The share of hidden page text past which "the page" is fairly described
 *  as hidden. Booking.com measured 98; a proper modal that hides everything
 *  but takes focus is correct behaviour and never reaches the finding. */
const BG_HIDDEN_THRESHOLD = 60;
/** Below this many sampled characters the percentage is noise, not a page. */
const MIN_SAMPLED_CHARS = 500;

function isDialog(role: string | null): boolean {
  return role === "dialog" || role === "alertdialog";
}

/** True when the measured facts say keyboard focus does not operate the
 *  banner: it neither starts there nor lands there on any sampled Tab.
 *  Unmeasured tab data (probe skipped or failed) counts as "not shown to
 *  arrive" only when initial focus was also elsewhere. */
function focusNeverInBanner(a: NonNullable<DarkPatternSignals["consentA11y"]>): boolean {
  if (a.focusInBanner) return false;
  if (a.tabsSampled === undefined) return true;
  return (a.tabsInBanner ?? 0) === 0;
}

export function evaluateConsentA11y(signals: DarkPatternSignals): AccessibilityFinding[] {
  const banner = signals.consentBanner;
  const a = signals.consentA11y;
  if (!banner || banner.frameUrl || !a) return [];

  const findings: AccessibilityFinding[] = [];

  if (
    a.bgHiddenPct >= BG_HIDDEN_THRESHOLD &&
    a.sampledChars >= MIN_SAMPLED_CHARS &&
    focusNeverInBanner(a)
  ) {
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "critical",
      category: "accessibility",
      wcagCriterion: "4.1.2",
      wcagLevel: "A",
      selector: banner.selector,
      elementSnippet: banner.snippet || undefined,
      description:
        `While the cookie banner is up, ${a.bgHiddenPct}% of the page's text is marked hidden for assistive technology, ` +
        `and keyboard focus never lands inside the banner. A screen reader user hears silence where the page should be, ` +
        `and cannot find the banner to clear it.`,
      suggestedFix:
        'Move focus into the banner when it opens and keep it there until a choice is made — then the hiding is a correct modal. ' +
        'Or stop hiding the page: a non-modal banner needs no aria-hidden at all.',
      ruleId: "consent-blocks-reader",
      helpUrl: DIALOG_PATTERN_URL,
    });
  }

  return findings;
}

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];

/**
 * The judgement-call shapes, as undecided rows: what the checker saw, for a
 * person to rule on. Never produced alongside consent-blocks-reader — one
 * fault, one card, and the finding above already owns that banner.
 */
export function consentA11yUndecided(signals: DarkPatternSignals): UndecidedRow[] {
  const banner = signals.consentBanner;
  const a = signals.consentA11y;
  // A consent layer in a cross-origin iframe cannot be probed from the host
  // page — and saying NOTHING was the wrong kind of honesty: everywhere
  // else, "saw it, cannot rule" becomes an undecided row, and an EU sweep
  // found four of forty-four banners living in exactly this shape.
  if (banner?.frameUrl) {
    return [
      {
        ruleId: "consent-layer-in-frame",
        count: 1,
        help: "The consent layer arrives from another website in a frame, where this scan cannot judge what a screen reader meets.",
        helpUrl: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
      },
    ];
  }
  if (!banner || !a) return [];
  if (evaluateConsentA11y(signals).length > 0) return [];

  const rows: UndecidedRow[] = [];
  const unnamed = !isDialog(a.role) && !a.accessibleName;

  if (unnamed && focusNeverInBanner(a)) {
    rows.push({
      ruleId: "consent-layer-unheralded",
      count: 1,
      help: "The cookie layer has no dialog role, no name, and keyboard focus never reaches it — a screen reader user may never learn it exists.",
      helpUrl: DIALOG_PATTERN_URL,
    });
  } else if (
    unnamed &&
    a.tabsSampled !== undefined &&
    a.tabsSampled >= 6 &&
    a.tabsInBanner === a.tabsSampled
  ) {
    rows.push({
      ruleId: "consent-trap-unnamed",
      count: 1,
      help: "Keyboard focus stays inside the cookie layer, but the layer never says what it is — no dialog role, no accessible name.",
      helpUrl: DIALOG_PATTERN_URL,
    });
  }

  return rows;
}