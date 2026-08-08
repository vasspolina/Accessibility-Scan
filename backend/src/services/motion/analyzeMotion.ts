import { randomUUID } from "node:crypto";
import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Deterministic motion/animation checks built on the animation signals the
// renderer already collects (running CSS animations, <marquee>, autoplaying
// media, prefers-reduced-motion support). Grounded in WCAG 2.2.2 Pause,
// Stop, Hide (Level A): moving content that starts automatically and can't
// be paused is a genuine barrier — it distracts everyone, and for people
// with vestibular disorders or attention/cognitive disabilities it can make
// a page unusable. These are accessibility-category findings, so they count
// toward the score.

const PAUSE_STOP_HIDE_URL = "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html";

type AnimatedElement = DomSignals["animatedElements"][number];

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  selector: string,
  description: string,
  suggestedFix: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "accessibility",
    wcagCriterion: "2.2.2",
    wcagLevel: "A",
    selector,
    description,
    suggestedFix,
    ruleId,
    helpUrl: PAUSE_STOP_HIDE_URL,
  };
}

/**
 * Pure and deterministic. One finding per rule (worst offender's selector +
 * count), consistent with the typography checks. `existingRuleIds` lets the
 * caller suppress overlap with axe-core rules that already cover the same
 * ground (axe's "marquee" and "no-autoplay-audio").
 */
export function evaluateMotion(
  animatedElements: AnimatedElement[],
  respectsReducedMotion: boolean,
  existingRuleIds: Set<string>,
  /**
   * Which animations were still running when reduced motion was actually
   * requested. Authoritative when present, because it is an observation of
   * this page rather than a guess from its stylesheets. Absent only when the
   * probe could not run, and then the old inference below is all there is.
   */
  measured?: { motionIgnoringPreference: Array<{ selector: string }>; failed?: boolean }
): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  // Deprecated <marquee> scrolling tickers — always moving, never pausable.
  const marquees = animatedElements.filter((a) => a.tag === "marquee");
  if (marquees.length > 0 && !existingRuleIds.has("marquee")) {
    findings.push(
      makeFinding(
        "motion-marquee",
        "serious",
        marquees[0].selector,
        `Text scrolls continuously in a moving ticker (<marquee>, ${marquees.length} place${marquees.length === 1 ? "" : "s"}) with no way to pause it. Moving text is hard to read for everyone and can be unusable for people with attention or balance disorders.`,
        "Remove the <marquee> element and present the text statically, or provide a visible pause/stop control."
      )
    );
  }

  // Media that starts playing by itself with no visible controls to stop it.
  const autoplayNoControls = animatedElements.filter(
    (a) => a.isAutoplayMedia && !a.hasPauseControls
  );
  if (autoplayNoControls.length > 0 && !existingRuleIds.has("no-autoplay-audio")) {
    findings.push(
      makeFinding(
        "motion-autoplay-media",
        "serious",
        autoplayNoControls[0].selector,
        `Media starts playing automatically with no visible controls to pause or stop it (${autoplayNoControls.length} element${autoplayNoControls.length === 1 ? "" : "s"}). Visitors can't stop the motion or sound, which is disorienting and plays over what a screen reader says.`,
        "Remove autoplay, or add visible player controls (the controls attribute) so visitors can pause or stop playback."
      )
    );
  }

  // Endless CSS animations on a page that ignores the visitor's
  // reduced-motion preference.
  const infinite = animatedElements.filter(
    (a) =>
      a.tag !== "marquee" &&
      !a.isAutoplayMedia &&
      a.animationIterationCount.includes("infinite")
  );

  if (infinite.length > 0) {
    if (measured && !measured.failed) {
      // The preference was switched on and these animations kept going. No
      // inference is involved, and that matters: the fallback below clears a
      // whole page the moment any stylesheet mentions prefers-reduced-motion,
      // so a site with one such rule covering a hover effect was recorded as
      // respecting a preference its spinning hero still ignores.
      const ignoring = new Set(measured.motionIgnoringPreference.map((m) => m.selector));
      const stillMoving = infinite.filter((a) => ignoring.has(a.selector));
      if (stillMoving.length > 0) {
        findings.push(
          makeFinding(
            "motion-infinite-no-reduced-motion",
            "moderate",
            stillMoving[0].selector,
            `${stillMoving.length} element${stillMoving.length === 1 ? " animates" : "s animate"} on this page without stopping, even though the visitor has asked their system to reduce motion. We checked by turning that setting on and watching.`,
            "Wrap the animation in @media (prefers-reduced-motion: no-preference), or stop it after a few seconds, or add a pause control. Note that having such a rule somewhere in your stylesheets is not enough — it has to cover these particular animations."
          )
        );
      }
    } else if (!respectsReducedMotion) {
      findings.push(
        makeFinding(
          "motion-infinite-no-reduced-motion",
          "moderate",
          infinite[0].selector,
          `Content animates non-stop (${infinite.length} element${infinite.length === 1 ? "" : "s"} with infinite animations). No stylesheet on this page mentions the visitor's "reduce motion" setting at all.`,
          "Wrap the animations in @media (prefers-reduced-motion: no-preference), or stop them after a few seconds, or add a pause control."
        )
      );
    }
  }

  return findings;
}
