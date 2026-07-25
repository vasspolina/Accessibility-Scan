// The WCAG 2.1 Level A and AA success criteria — the exact set EN 301 549
// (and therefore the European Accessibility Act) requires for web content.
// 30 Level A + 20 Level AA = 50 criteria.
//
// `coverage` records how much of each criterion this scanner can actually
// judge, and it is the honest core of the conformance report:
//
//   "automated" — we detect the common failure modes mechanically.
//   "partial"   — we catch some failure modes; others need a human.
//   "manual"    — we cannot meaningfully test this at all (media captions,
//                 timing limits, multi-step process safeguards).
//
// No automated tool can prove a criterion PASSES — only that it found no
// failure. Every label the report shows is worded to respect that. Claiming
// conformance from a scan is precisely the overclaim the accessibility
// industry is criticised for, and it is not something this report will do.

export type CriterionLevel = "A" | "AA";
export type CriterionCoverage = "automated" | "partial" | "manual";

export interface WcagCriterion {
  id: string; // "1.4.4"
  name: string;
  level: CriterionLevel;
  coverage: CriterionCoverage;
  // Plain-language question the criterion asks, written for a business owner
  // rather than quoting the standard at them. Used for rows we found nothing
  // wrong with and rows a person still has to check.
  plain: string;
  // What to say when the criterion is failing. A row that states the rule and
  // then labels it "Failing" reads as though the rule itself is broken, and
  // asserts the opposite of the finding. When something is wrong, say what is
  // wrong — the reader wants the problem, not the requirement.
  failing: string;
}

export const WCAG_21_AA_CRITERIA: WcagCriterion[] = [
  // ---- Perceivable ------------------------------------------------------
  { id: "1.1.1", name: "Non-text Content", level: "A", coverage: "automated", plain: "Do images and icons carry a text description?", failing: "Some images have no text description" },
  { id: "1.2.1", name: "Audio-only and Video-only (Prerecorded)", level: "A", coverage: "manual", plain: "Do audio and video have a text alternative?", failing: "Some audio or video has no text alternative" },
  { id: "1.2.2", name: "Captions (Prerecorded)", level: "A", coverage: "manual", plain: "Do your videos have captions?", failing: "Some videos have no captions" },
  { id: "1.2.3", name: "Audio Description or Media Alternative", level: "A", coverage: "manual", plain: "Do videos describe what's shown on screen?", failing: "Some videos never describe what's shown on screen" },
  { id: "1.2.4", name: "Captions (Live)", level: "AA", coverage: "manual", plain: "Does live video have live captions?", failing: "Live video runs without live captions" },
  { id: "1.2.5", name: "Audio Description (Prerecorded)", level: "AA", coverage: "manual", plain: "Do videos have an audio description track?", failing: "Some videos have no audio description track" },
  { id: "1.3.1", name: "Info and Relationships", level: "A", coverage: "automated", plain: "Is the structure in the code, not just the visual design?", failing: "Some structure is only visual, so it's missing from the code" },
  { id: "1.3.2", name: "Meaningful Sequence", level: "A", coverage: "partial", plain: "Is content read out in an order that makes sense?", failing: "Some content is read out in a confusing order" },
  { id: "1.3.3", name: "Sensory Characteristics", level: "A", coverage: "manual", plain: "Do instructions avoid relying on shape, size or position alone?", failing: "Some instructions rely on shape, size or position alone" },
  { id: "1.3.4", name: "Orientation", level: "AA", coverage: "manual", plain: "Does the page work in both portrait and landscape?", failing: "The page doesn't work in both portrait and landscape" },
  { id: "1.3.5", name: "Identify Input Purpose", level: "AA", coverage: "automated", plain: "Do form fields say what they collect, so browsers can autofill?", failing: "Some form fields don't say what they collect, so browsers can't autofill" },
  { id: "1.4.1", name: "Use of Color", level: "A", coverage: "partial", plain: "Is colour never the only way information is conveyed?", failing: "Some information is carried by colour alone" },
  { id: "1.4.2", name: "Audio Control", level: "A", coverage: "automated", plain: "Can auto-playing audio be stopped?", failing: "Auto-playing audio can't be stopped" },
  { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", coverage: "automated", plain: "Does text stand out enough from its background?", failing: "Some text doesn't stand out enough from its background" },
  { id: "1.4.4", name: "Resize Text", level: "AA", coverage: "automated", plain: "Does text stay readable when enlarged to 200%?", failing: "Text breaks when it's enlarged to 200%" },
  { id: "1.4.5", name: "Images of Text", level: "AA", coverage: "manual", plain: "Is real text used instead of pictures of text?", failing: "Pictures of text are used where real text should be" },
  { id: "1.4.10", name: "Reflow", level: "AA", coverage: "automated", plain: "Does the page reflow on a narrow screen without sideways scrolling?", failing: "The page scrolls sideways on a narrow screen" },
  { id: "1.4.11", name: "Non-text Contrast", level: "AA", coverage: "automated", plain: "Do buttons, icons and borders stand out enough?", failing: "Some buttons, icons or borders don't stand out enough" },
  { id: "1.4.12", name: "Text Spacing", level: "AA", coverage: "automated", plain: "Does everything survive a reader widening line and letter spacing?", failing: "Things break when a reader widens line and letter spacing" },
  { id: "1.4.13", name: "Content on Hover or Focus", level: "AA", coverage: "manual", plain: "Can tooltips and pop-ups be dismissed, and do they stay out of the way?", failing: "Some tooltips or pop-ups can't be dismissed, or block what's underneath" },

  // ---- Operable ---------------------------------------------------------
  { id: "2.1.1", name: "Keyboard", level: "A", coverage: "partial", plain: "Does everything work without a mouse?", failing: "Some things don't work without a mouse" },
  { id: "2.1.2", name: "No Keyboard Trap", level: "A", coverage: "automated", plain: "Can keyboard users always move out of every part of the page?", failing: "Keyboard users get stuck in part of the page" },
  { id: "2.1.4", name: "Character Key Shortcuts", level: "A", coverage: "manual", plain: "Can single-key shortcuts be turned off or remapped?", failing: "Single-key shortcuts can't be turned off or remapped" },
  { id: "2.2.1", name: "Timing Adjustable", level: "A", coverage: "manual", plain: "Can time limits be extended or turned off?", failing: "Time limits can't be extended or turned off" },
  { id: "2.2.2", name: "Pause, Stop, Hide", level: "A", coverage: "automated", plain: "Can moving or auto-updating content be paused?", failing: "Moving or auto-updating content can't be paused" },
  { id: "2.3.1", name: "Three Flashes or Below Threshold", level: "A", coverage: "manual", plain: "Is nothing flashing fast enough to risk a seizure?", failing: "Something flashes fast enough to risk a seizure" },
  { id: "2.4.1", name: "Bypass Blocks", level: "A", coverage: "automated", plain: "Is there a way to skip past the menu to the content?", failing: "There's no way to skip past the menu to the content" },
  { id: "2.4.2", name: "Page Titled", level: "A", coverage: "automated", plain: "Does the page have a title that describes it?", failing: "The page title is missing, or doesn't describe the page" },
  { id: "2.4.3", name: "Focus Order", level: "A", coverage: "partial", plain: "Does tabbing move through the page in a sensible order?", failing: "Tabbing moves through the page in a confusing order" },
  { id: "2.4.4", name: "Link Purpose (In Context)", level: "A", coverage: "automated", plain: "Does link text say where the link goes?", failing: "Some link text doesn't say where the link goes" },
  { id: "2.4.5", name: "Multiple Ways", level: "AA", coverage: "partial", plain: "Is there more than one way to find a page?", failing: "There's only one way to find a page" },
  { id: "2.4.6", name: "Headings and Labels", level: "AA", coverage: "partial", plain: "Do headings and labels describe what follows?", failing: "Some headings or labels don't describe what follows" },
  { id: "2.4.7", name: "Focus Visible", level: "AA", coverage: "automated", plain: "Can you see where you are when tabbing?", failing: "You can't see where you are when tabbing" },
  { id: "2.5.1", name: "Pointer Gestures", level: "A", coverage: "manual", plain: "Does anything needing a swipe or pinch have a simpler alternative?", failing: "Something needing a swipe or pinch has no simpler alternative" },
  { id: "2.5.2", name: "Pointer Cancellation", level: "A", coverage: "manual", plain: "Can a mis-tap be undone by moving away before releasing?", failing: "A mis-tap can't be undone by moving away before releasing" },
  { id: "2.5.3", name: "Label in Name", level: "A", coverage: "automated", plain: "Does a control's spoken name match its visible text?", failing: "A control's spoken name doesn't match its visible text" },
  { id: "2.5.4", name: "Motion Actuation", level: "A", coverage: "manual", plain: "Does anything triggered by shaking or tilting have a normal control too?", failing: "Something triggered by shaking or tilting has no normal control" },

  // ---- Understandable ---------------------------------------------------
  { id: "3.1.1", name: "Language of Page", level: "A", coverage: "automated", plain: "Does the page declare its language, so screen readers pronounce it right?", failing: "The page doesn't declare its language, so screen readers mispronounce it" },
  { id: "3.1.2", name: "Language of Parts", level: "AA", coverage: "manual", plain: "Are passages in another language marked as such?", failing: "Passages in another language aren't marked as such" },
  { id: "3.2.1", name: "On Focus", level: "A", coverage: "manual", plain: "Does nothing unexpected happen just from tabbing to something?", failing: "Something unexpected happens just from tabbing to it" },
  { id: "3.2.2", name: "On Input", level: "A", coverage: "manual", plain: "Does changing a field avoid unexpectedly changing the page?", failing: "Changing a field unexpectedly changes the page" },
  { id: "3.2.3", name: "Consistent Navigation", level: "AA", coverage: "manual", plain: "Does navigation stay in the same place across pages?", failing: "Navigation moves around from page to page" },
  { id: "3.2.4", name: "Consistent Identification", level: "AA", coverage: "manual", plain: "Is the same thing named the same way throughout?", failing: "The same thing is named differently in different places" },
  { id: "3.3.1", name: "Error Identification", level: "A", coverage: "partial", plain: "Are form errors clearly identified?", failing: "Some form errors aren't clearly identified" },
  { id: "3.3.2", name: "Labels or Instructions", level: "A", coverage: "automated", plain: "Do form fields tell you what to enter?", failing: "Some form fields don't tell you what to enter" },
  { id: "3.3.3", name: "Error Suggestion", level: "AA", coverage: "partial", plain: "Do errors explain how to fix them?", failing: "Some errors don't explain how to fix them" },
  { id: "3.3.4", name: "Error Prevention (Legal, Financial, Data)", level: "AA", coverage: "manual", plain: "Can important submissions be reviewed or reversed?", failing: "Important submissions can't be reviewed or reversed" },

  // ---- Robust -----------------------------------------------------------
  { id: "4.1.1", name: "Parsing", level: "A", coverage: "automated", plain: "Is the underlying HTML valid?", failing: "The underlying HTML has errors" },
  { id: "4.1.2", name: "Name, Role, Value", level: "A", coverage: "automated", plain: "Do custom controls announce what they are and what they're doing?", failing: "Some custom controls don't announce what they are or what they're doing" },
  { id: "4.1.3", name: "Status Messages", level: "AA", coverage: "manual", plain: "Are status updates announced without moving focus?", failing: "Status updates aren't announced, or they move focus" },
];

// Normalises the many shapes a criterion reference arrives in — axe gives
// "1.4.4", the AI layer gives "1.4.4 Resize Text (AA)", and some findings
// carry "N/A" or a fallback string — down to a bare number, or undefined when
// there isn't one.
export function normalizeCriterionId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = /(\d)\.(\d{1,2})\.(\d{1,2})/.exec(raw);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : undefined;
}
