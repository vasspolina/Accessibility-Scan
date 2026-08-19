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
  { id: "1.1.1", name: "Non-text Content", level: "A", coverage: "automated", plain: "Do images have a description for people who can't see them?", failing: "Images are missing a description for people who can't see them" },
  { id: "1.2.1", name: "Audio-only and Video-only (Prerecorded)", level: "A", coverage: "manual", plain: "Do audio and video have a text version?", failing: "Audio and video have no text version" },
  { id: "1.2.2", name: "Captions (Prerecorded)", level: "A", coverage: "manual", plain: "Do your videos have captions?", failing: "Videos play without captions" },
  { id: "1.2.3", name: "Audio Description or Media Alternative (Prerecorded)", level: "A", coverage: "manual", plain: "Do videos say out loud what's shown on screen?", failing: "Videos never say out loud what's on screen" },
  { id: "1.2.4", name: "Captions (Live)", level: "AA", coverage: "manual", plain: "Does live video have live captions?", failing: "Live video runs with no captions" },
  { id: "1.2.5", name: "Audio Description (Prerecorded)", level: "AA", coverage: "manual", plain: "Do videos have a spoken description of what's on screen?", failing: "Videos have no spoken description of what's on screen" },
  { id: "1.3.1", name: "Info and Relationships", level: "A", coverage: "automated", plain: "Do your lists and headings exist in the code, not just in the design?", failing: "Lists and headings look right on screen but the code doesn't say what they are" },
  { id: "1.3.2", name: "Meaningful Sequence", level: "A", coverage: "partial", plain: "Do screen readers read the page in a sensible order?", failing: "Screen readers read parts of the page out of order" },
  { id: "1.3.3", name: "Sensory Characteristics", level: "A", coverage: "manual", plain: "Do instructions work without seeing shape, size or position?", failing: "Instructions rely on seeing shape, size or position" },
  { id: "1.3.4", name: "Orientation", level: "AA", coverage: "manual", plain: "Does the page work held sideways?", failing: "The page doesn't work when the phone is held sideways" },
  { id: "1.3.5", name: "Identify Input Purpose", level: "AA", coverage: "automated", plain: "Do form fields say what they're for, so browsers can fill them in?", failing: "Form fields don't say what they're for, so browsers can't fill them in" },
  { id: "1.4.1", name: "Use of Color", level: "A", coverage: "partial", plain: "Is anything shown by colour alone?", failing: "Colour alone carries the meaning, so colour-blind visitors miss it" },
  { id: "1.4.2", name: "Audio Control", level: "A", coverage: "automated", plain: "Can sound that starts on its own be turned off?", failing: "Sound starts on its own and can't be turned off" },
  { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", coverage: "automated", plain: "Is text dark enough to read against its background?", failing: "Text is too pale to read against its background" },
  { id: "1.4.4", name: "Resize Text", level: "AA", coverage: "automated", plain: "Does text stay readable when someone makes it bigger?", failing: "Text gets cut off when someone makes it bigger" },
  { id: "1.4.5", name: "Images of Text", level: "AA", coverage: "manual", plain: "Is text real text, rather than a picture of text?", failing: "Pictures of text blur when someone enlarges them" },
  { id: "1.4.10", name: "Reflow", level: "AA", coverage: "automated", plain: "Does the page fit a phone screen without scrolling sideways?", failing: "The page scrolls sideways on a phone" },
  { id: "1.4.11", name: "Non-text Contrast", level: "AA", coverage: "automated", plain: "Are buttons and icons dark enough to make out?", failing: "Buttons and icons are too pale to make out" },
  { id: "1.4.12", name: "Text Spacing", level: "AA", coverage: "automated", plain: "Does the page survive someone spacing out the text to read it?", failing: "Text overlaps and runs together when someone spaces it out to read it" },
  { id: "1.4.13", name: "Content on Hover or Focus", level: "AA", coverage: "manual", plain: "Can pop-ups be closed, and do they stay out of the way?", failing: "Pop-ups can't be closed, or cover what you were reading" },

  // ---- Operable ---------------------------------------------------------
  { id: "2.1.1", name: "Keyboard", level: "A", coverage: "partial", plain: "Does everything work without a mouse?", failing: "Parts of the page only work with a mouse" },
  { id: "2.1.2", name: "No Keyboard Trap", level: "A", coverage: "automated", plain: "Can keyboard users always tab back out again?", failing: "Keyboard users get stuck and can't tab back out" },
  { id: "2.1.4", name: "Character Key Shortcuts", level: "A", coverage: "manual", plain: "Can single-key shortcuts be turned off?", failing: "Single-key shortcuts can't be turned off, so speech users trigger them by accident" },
  { id: "2.2.1", name: "Timing Adjustable", level: "A", coverage: "partial", plain: "Can a time limit be extended or turned off?", failing: "A time limit can't be extended or turned off" },
  { id: "2.2.2", name: "Pause, Stop, Hide", level: "A", coverage: "automated", plain: "Can moving content be stopped?", failing: "Moving content can't be stopped" },
  { id: "2.3.1", name: "Three Flashes or Below Threshold", level: "A", coverage: "manual", plain: "Is anything flashing fast enough to trigger a seizure?", failing: "Something flashes fast enough to trigger a seizure" },
  { id: "2.4.1", name: "Bypass Blocks", level: "A", coverage: "automated", plain: "Is there a way to jump past the menu to the main content?", failing: "There's no way to jump past the menu to the main content" },
  { id: "2.4.2", name: "Page Titled", level: "A", coverage: "automated", plain: "Does the browser tab say what this page is?", failing: "The browser tab doesn't say what this page is" },
  { id: "2.4.3", name: "Focus Order", level: "A", coverage: "partial", plain: "Does tabbing move through the page in the order it reads?", failing: "Tabbing jumps around the page in a confusing order" },
  { id: "2.4.4", name: "Link Purpose (In Context)", level: "A", coverage: "automated", plain: "Does every link say where it goes?", failing: "Links don't say where they go" },
  { id: "2.4.5", name: "Multiple Ways", level: "AA", coverage: "partial", plain: "Is there more than one way to reach a page?", failing: "Pages can only be reached one way" },
  { id: "2.4.6", name: "Headings and Labels", level: "AA", coverage: "partial", plain: "Do headings and labels describe what's under them?", failing: "Headings and labels don't describe what's under them" },
  { id: "2.4.7", name: "Focus Visible", level: "AA", coverage: "automated", plain: "Can you see where you are while tabbing through?", failing: "You can't see where you are while tabbing through" },
  { id: "2.5.1", name: "Pointer Gestures", level: "A", coverage: "manual", plain: "Is there a simpler way to do anything needing a swipe or pinch?", failing: "A swipe or pinch is the only way to do something" },
  { id: "2.5.2", name: "Pointer Cancellation", level: "A", coverage: "manual", plain: "Can someone who taps the wrong thing slide their finger off to undo it?", failing: "Tapping the wrong thing can't be undone by sliding your finger off it" },
  { id: "2.5.3", name: "Label in Name", level: "A", coverage: "automated", plain: "Does a button's spoken name match the words on it?", failing: "A button's spoken name doesn't match the words on it" },
  { id: "2.5.4", name: "Motion Actuation", level: "A", coverage: "manual", plain: "Is there a normal control for anything worked by shaking or tilting?", failing: "An action only works by shaking or tilting the device" },

  // ---- Understandable ---------------------------------------------------
  { id: "3.1.1", name: "Language of Page", level: "A", coverage: "automated", plain: "Does the page say what language it's in?", failing: "The page doesn't say what language it's in, so screen readers mispronounce it" },
  { id: "3.1.2", name: "Language of Parts", level: "AA", coverage: "manual", plain: "Are words in another language marked as such?", failing: "Words in another language aren't marked, so they're read out wrong" },
  { id: "3.2.1", name: "On Focus", level: "A", coverage: "manual", plain: "Does anything change just from tabbing onto it?", failing: "Tabbing onto something changes the page" },
  { id: "3.2.2", name: "On Input", level: "A", coverage: "manual", plain: "Does filling in a field change the page unexpectedly?", failing: "Filling in a field changes the page unexpectedly" },
  { id: "3.2.3", name: "Consistent Navigation", level: "AA", coverage: "manual", plain: "Does the menu stay in the same place on every page?", failing: "The menu moves around from page to page" },
  { id: "3.2.4", name: "Consistent Identification", level: "AA", coverage: "manual", plain: "Is the same thing called the same name everywhere?", failing: "The same thing is called different names in different places" },
  { id: "3.3.1", name: "Error Identification", level: "A", coverage: "partial", plain: "Do form errors say which field is wrong?", failing: "Form errors don't say which field is wrong" },
  { id: "3.3.2", name: "Labels or Instructions", level: "A", coverage: "automated", plain: "Do form fields say what to type?", failing: "Form fields don't say what to type" },
  { id: "3.3.3", name: "Error Suggestion", level: "AA", coverage: "partial", plain: "Do error messages say how to fix the problem?", failing: "Error messages don't say how to fix the problem" },
  { id: "3.3.4", name: "Error Prevention (Legal, Financial, Data)", level: "AA", coverage: "manual", plain: "Can important submissions be checked or undone?", failing: "Important submissions can't be checked or undone" },

  // ---- Robust -----------------------------------------------------------
  { id: "4.1.1", name: "Parsing", level: "A", coverage: "automated", plain: "Is the page's code free of mistakes that confuse screen readers?", failing: "The page's code has mistakes that can confuse screen readers" },
  { id: "4.1.2", name: "Name, Role, Value", level: "A", coverage: "automated", plain: "Do buttons and menus tell screen readers what they are?", failing: "Buttons and menus don't tell screen readers what they are" },
  { id: "4.1.3", name: "Status Messages", level: "AA", coverage: "manual", plain: "Are updates like 'added to basket' announced out loud?", failing: "Updates like 'added to basket' aren't announced out loud" },
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
