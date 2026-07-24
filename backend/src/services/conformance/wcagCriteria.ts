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
  // Plain-language statement of what the criterion is actually for, written
  // for a business owner rather than quoting the standard at them.
  plain: string;
}

export const WCAG_21_AA_CRITERIA: WcagCriterion[] = [
  // ---- Perceivable ------------------------------------------------------
  { id: "1.1.1", name: "Non-text Content", level: "A", coverage: "automated", plain: "Images and icons carry a text description." },
  { id: "1.2.1", name: "Audio-only and Video-only (Prerecorded)", level: "A", coverage: "manual", plain: "Audio and video have a text alternative." },
  { id: "1.2.2", name: "Captions (Prerecorded)", level: "A", coverage: "manual", plain: "Videos have captions." },
  { id: "1.2.3", name: "Audio Description or Media Alternative", level: "A", coverage: "manual", plain: "Videos describe what's shown on screen." },
  { id: "1.2.4", name: "Captions (Live)", level: "AA", coverage: "manual", plain: "Live video has live captions." },
  { id: "1.2.5", name: "Audio Description (Prerecorded)", level: "AA", coverage: "manual", plain: "Videos have an audio description track." },
  { id: "1.3.1", name: "Info and Relationships", level: "A", coverage: "automated", plain: "Structure is in the code, not just the visual design." },
  { id: "1.3.2", name: "Meaningful Sequence", level: "A", coverage: "partial", plain: "Content is read in an order that makes sense." },
  { id: "1.3.3", name: "Sensory Characteristics", level: "A", coverage: "manual", plain: "Instructions don't rely on shape, size or position alone." },
  { id: "1.3.4", name: "Orientation", level: "AA", coverage: "manual", plain: "The page works in both portrait and landscape." },
  { id: "1.3.5", name: "Identify Input Purpose", level: "AA", coverage: "automated", plain: "Form fields say what they collect so browsers can autofill." },
  { id: "1.4.1", name: "Use of Color", level: "A", coverage: "partial", plain: "Colour is never the only way information is conveyed." },
  { id: "1.4.2", name: "Audio Control", level: "A", coverage: "automated", plain: "Auto-playing audio can be stopped." },
  { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", coverage: "automated", plain: "Text stands out enough from its background." },
  { id: "1.4.4", name: "Resize Text", level: "AA", coverage: "automated", plain: "Text stays readable when enlarged to 200%." },
  { id: "1.4.5", name: "Images of Text", level: "AA", coverage: "manual", plain: "Real text is used instead of pictures of text." },
  { id: "1.4.10", name: "Reflow", level: "AA", coverage: "automated", plain: "The page reflows on a narrow screen without sideways scrolling." },
  { id: "1.4.11", name: "Non-text Contrast", level: "AA", coverage: "automated", plain: "Buttons, icons and borders stand out enough." },
  { id: "1.4.12", name: "Text Spacing", level: "AA", coverage: "automated", plain: "Nothing breaks when a reader widens line and letter spacing." },
  { id: "1.4.13", name: "Content on Hover or Focus", level: "AA", coverage: "manual", plain: "Tooltips and pop-ups can be dismissed and don't get in the way." },

  // ---- Operable ---------------------------------------------------------
  { id: "2.1.1", name: "Keyboard", level: "A", coverage: "partial", plain: "Everything works without a mouse." },
  { id: "2.1.2", name: "No Keyboard Trap", level: "A", coverage: "automated", plain: "Keyboard users never get stuck in one part of the page." },
  { id: "2.1.4", name: "Character Key Shortcuts", level: "A", coverage: "manual", plain: "Single-key shortcuts can be turned off or remapped." },
  { id: "2.2.1", name: "Timing Adjustable", level: "A", coverage: "manual", plain: "Time limits can be extended or turned off." },
  { id: "2.2.2", name: "Pause, Stop, Hide", level: "A", coverage: "automated", plain: "Moving or auto-updating content can be paused." },
  { id: "2.3.1", name: "Three Flashes or Below Threshold", level: "A", coverage: "manual", plain: "Nothing flashes fast enough to risk a seizure." },
  { id: "2.4.1", name: "Bypass Blocks", level: "A", coverage: "automated", plain: "There's a way to skip past the menu to the content." },
  { id: "2.4.2", name: "Page Titled", level: "A", coverage: "automated", plain: "The page has a title that describes it." },
  { id: "2.4.3", name: "Focus Order", level: "A", coverage: "partial", plain: "Tabbing moves through the page in a sensible order." },
  { id: "2.4.4", name: "Link Purpose (In Context)", level: "A", coverage: "automated", plain: "Link text says where the link goes." },
  { id: "2.4.5", name: "Multiple Ways", level: "AA", coverage: "partial", plain: "There's more than one way to find a page." },
  { id: "2.4.6", name: "Headings and Labels", level: "AA", coverage: "partial", plain: "Headings and labels describe what follows." },
  { id: "2.4.7", name: "Focus Visible", level: "AA", coverage: "automated", plain: "You can see where you are when tabbing." },
  { id: "2.5.1", name: "Pointer Gestures", level: "A", coverage: "manual", plain: "Anything needing a swipe or pinch has a simpler alternative." },
  { id: "2.5.2", name: "Pointer Cancellation", level: "A", coverage: "manual", plain: "A mis-tap can be undone by moving away before releasing." },
  { id: "2.5.3", name: "Label in Name", level: "A", coverage: "automated", plain: "A control's spoken name matches its visible text." },
  { id: "2.5.4", name: "Motion Actuation", level: "A", coverage: "manual", plain: "Anything triggered by shaking or tilting has a normal control too." },

  // ---- Understandable ---------------------------------------------------
  { id: "3.1.1", name: "Language of Page", level: "A", coverage: "automated", plain: "The page declares its language so screen readers pronounce it right." },
  { id: "3.1.2", name: "Language of Parts", level: "AA", coverage: "manual", plain: "Passages in another language are marked as such." },
  { id: "3.2.1", name: "On Focus", level: "A", coverage: "manual", plain: "Nothing unexpected happens just from tabbing to something." },
  { id: "3.2.2", name: "On Input", level: "A", coverage: "manual", plain: "Changing a field doesn't unexpectedly change the page." },
  { id: "3.2.3", name: "Consistent Navigation", level: "AA", coverage: "manual", plain: "Navigation stays in the same place across pages." },
  { id: "3.2.4", name: "Consistent Identification", level: "AA", coverage: "manual", plain: "The same thing is named the same way throughout." },
  { id: "3.3.1", name: "Error Identification", level: "A", coverage: "partial", plain: "Form errors are clearly identified." },
  { id: "3.3.2", name: "Labels or Instructions", level: "A", coverage: "automated", plain: "Form fields tell you what to enter." },
  { id: "3.3.3", name: "Error Suggestion", level: "AA", coverage: "partial", plain: "Errors explain how to fix them." },
  { id: "3.3.4", name: "Error Prevention (Legal, Financial, Data)", level: "AA", coverage: "manual", plain: "Important submissions can be reviewed or reversed." },

  // ---- Robust -----------------------------------------------------------
  { id: "4.1.1", name: "Parsing", level: "A", coverage: "automated", plain: "The underlying HTML is valid." },
  { id: "4.1.2", name: "Name, Role, Value", level: "A", coverage: "automated", plain: "Custom controls announce what they are and what they're doing." },
  { id: "4.1.3", name: "Status Messages", level: "AA", coverage: "manual", plain: "Status updates are announced without moving focus." },
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
