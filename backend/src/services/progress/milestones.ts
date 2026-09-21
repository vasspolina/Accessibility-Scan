/**
 * The scan's visible itinerary.
 *
 * The render times ~28 internal phases; a reader waiting on the other end
 * of an SSE stream needs the eight that mean something: what the scanner
 * is doing now, in the order it does it. Ids, not sentences — the widget
 * owns the wording in the reader's language, the backend states only which
 * step began.
 *
 * The order here is the order the pipeline actually runs its steps in, and
 * the mapping is many-to-one on purpose: "keyboard" covers the walk, the
 * consent-frame tab probe, the activation pass and the dialog probe,
 * because to the person waiting they are one activity.
 */

export const MILESTONES = [
  "load",
  "rules",
  "screen-reader",
  "photograph",
  "keyboard",
  "text-resize",
  "phone",
  "ai-review",
  "report",
] as const;

export type MilestoneId = (typeof MILESTONES)[number];

const PHASE_TO_MILESTONE: Record<string, MilestoneId> = {
  goto: "load",
  subresources: "load",
  ariaSnapshot: "rules",
  domSignals: "rules",
  typography: "rules",
  controlBoundaries: "rules",
  darkPatterns: "rules",
  axe: "rules",
  axeConsentFrame: "rules",
  screenReader: "screen-reader",
  settleLayout: "photograph",
  viewportShot: "photograph",
  fullPageShot: "photograph",
  behindConsentShot: "photograph",
  elementShots: "photograph",
  keyboard: "keyboard",
  consentTabProbe: "keyboard",
  darkContrast: "keyboard",
  activation: "keyboard",
  textResize: "text-resize",
  mobileSwitch: "phone",
  mobile: "phone",
  reflow320: "phone",
  orientationLock: "phone",
  mobileContrast: "phone",
  mobileShots: "phone",
  prefsProbe: "phone",
  dialogProbe: "phone",
};

export function milestoneForPhase(phase: string): MilestoneId | undefined {
  return PHASE_TO_MILESTONE[phase];
}
