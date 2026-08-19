import { z } from "zod";

export const severitySchema = z.enum(["critical", "serious", "moderate", "minor"]);
export type Severity = z.infer<typeof severitySchema>;

export const findingSourceSchema = z.enum(["automated", "ai-review"]);
export type FindingSource = z.infer<typeof findingSourceSchema>;

// "accessibility" drives the 0-100 score (WCAG-groundable, from axe + the AI
// judgment layer). "design-clarity" and "dark-pattern" are AI-only, reported
// separately so they don't muddy the accessibility score's meaning — a page
// can be perfectly WCAG-conformant and still use manipulative checkout UX.
export const findingCategorySchema = z.enum(["accessibility", "design-clarity", "dark-pattern"]);
export type FindingCategory = z.infer<typeof findingCategorySchema>;

export const accessibilityFindingSchema = z.object({
  id: z.string(),
  source: findingSourceSchema,
  severity: severitySchema,
  category: findingCategorySchema,
  wcagCriterion: z.string().optional(),
  // WCAG conformance level (A/AA/AAA), derived from axe's tags — only set
  // for category:"accessibility" findings from the automated layer. AI
  // findings aren't asked to classify formal conformance level.
  wcagLevel: z.enum(["A", "AA", "AAA"]).optional(),
  selector: z.string(),
  elementSnippet: z.string().optional(),
  // A colour that would pass, for a contrast failure. Keeps the original hue
  // and saturation and moves only lightness, so the suggestion is still
  // recognisably the same colour rather than "use black".
  suggestedColour: z
    .object({
      from: z.string(),
      to: z.string(),
      background: z.string(),
      ratio: z.number(),
      required: z.number(),
    })
    .optional(),
  // A short headline for the finding (roughly 4-8 words). Deterministic
  // findings get theirs from the widget's plain-language map; AI findings
  // supply their own, because only the model knows what it just wrote about.
  title: z.string().optional(),
  description: z.string(),
  suggestedFix: z.string(),
  ruleId: z.string().optional(),
  // Link to an official explanation of the rule — axe findings get their
  // Deque University help page; other findings may link to relevant W3C
  // guidance. Rendered as a "Learn more" link in the widgets.
  helpUrl: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  // Base64 JPEG thumbnail of the flagged element, cropped from a full-page
  // screenshot server-side. Omitted when the element couldn't be located
  // or the thumbnail cap for this scan was reached — see routes/scan.ts.
  elementScreenshot: z.string().optional(),
  // Set only when there is no screenshot and the page could tell us why —
  // the element is hidden, or parked off-screen until it is used. Both are
  // usually correct behaviour, and saying so is what stops a picture-less
  // finding reading as a broken report.
  pictureNote: z.string().optional(),
  // One sentence from the age-inclusive review on how this measured finding
  // lands for visitors past sixty. Its own field, not folded into the
  // description: rules with a plain-language account show that account
  // instead of the description, which made the first shipped note invisible
  // on the very rule it attached to.
  ageNote: z.string().optional(),
  // For images missing alt text: an AI-generated, ready-to-use alt-text
  // suggestion based on looking at the actual image (see aiReview/
  // suggestAltText.ts). Present only when the AI layer ran and produced one.
  // An empty string is meaningful — it signals the image looks purely
  // decorative and should get alt="" so assistive tech skips it. Undefined
  // means no suggestion was generated (no key, not an image finding, etc.).
  suggestedAltText: z.string().optional(),
});
export type AccessibilityFinding = z.infer<typeof accessibilityFindingSchema>;

// Shape Claude must return — no id/source (assigned during merge).
export const aiFindingSchema = z.object({
  severity: severitySchema,
  category: findingCategorySchema,
  wcagCriterion: z.string().optional(),
  selector: z.string(),
  // Short headline, so the report can lead with a scannable summary instead
  // of a paragraph. Optional: an older/omitting response still validates and
  // the widget falls back to the description.
  title: z.string().optional(),
  description: z.string(),
  suggestedFix: z.string(),
  // Defaulted rather than required: the model sometimes omits it, and throwing
  // away a substantive, already-paid-for finding over a missing confidence
  // rating is a bad trade. "medium" is the honest assumption when unstated.
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});
export type AiFinding = z.infer<typeof aiFindingSchema>;

export const aiReviewResponseSchema = z.object({
  findings: z.array(aiFindingSchema),
});
export type AiReviewResponse = z.infer<typeof aiReviewResponseSchema>;

export const severitySummarySchema = z.object({
  critical: z.number(),
  serious: z.number(),
  moderate: z.number(),
  minor: z.number(),
  total: z.number(),
});
export type SeveritySummary = z.infer<typeof severitySummarySchema>;

export const aiReviewStatusSchema = z.enum([
  "completed",
  "skipped_no_key",
  "skipped_timeout",
  "skipped_error",
  "disabled_by_request",
]);
export type AiReviewStatus = z.infer<typeof aiReviewStatusSchema>;

// Why a failed AI review failed, in coarse terms. A small fixed set, never a
// raw error message: this crosses a public API boundary.
export const aiReviewErrorKindSchema = z.enum([
  "overloaded",
  "invalid_request",
  "auth",
  "truncated",
  "malformed",
  "unknown",
]);

export const categorySummarySchema = z.object({
  accessibility: z.number(),
  designClarity: z.number(),
  darkPattern: z.number(),
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

// One announcement in the screen-reader preview — see
// services/screenReader/analyzeScreenReader.ts. An approximation of what a
// screen reader says, not a recording of any specific one.
export const screenReaderLineSchema = z.object({
  text: z.string(),
  kind: z.enum([
    "landmark",
    "heading",
    "link",
    "button",
    "image",
    "field",
    "list",
    "table",
    "frame",
    "text",
  ]),
  selector: z.string(),
  issue: z.string().optional(),
});
export type ScreenReaderLine = z.infer<typeof screenReaderLineSchema>;

export const screenReaderScriptSchema = z.object({
  lines: z.array(screenReaderLineSchema),
  truncated: z.boolean(),
});
export type ScreenReaderScript = z.infer<typeof screenReaderScriptSchema>;

// WCAG 2.1 A/AA conformance, criterion by criterion — the standard EN 301 549
// (and so the European Accessibility Act) points at. There is deliberately no
// "pass" status: a scan can evidence a failure, never conformance.
export const criterionResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(["A", "AA"]),
  coverage: z.enum(["automated", "partial", "manual"]),
  plain: z.string(),
  failing: z.string(),
  status: z.enum(["failed", "no-issues-found", "needs-review"]),
  findingCount: z.number(),
});

// What changes when EN 301 549 adopts WCAG 2.2, expected in the Official
// Journal around October 2026. Kept separate from the conformance summary on
// purpose: reporting a site as failing something it is not yet required to
// meet would be the same overclaim this report refuses elsewhere.
export const wcag22CriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(["A", "AA"]),
  coverage: z.enum(["automated", "manual"]),
  plain: z.string(),
  failing: z.string(),
  whyManual: z.string().optional(),
  status: z.enum(["already-failing", "no-issues-found", "needs-review"]),
  findingCount: z.number(),
});

export const wcag22ReadinessSchema = z.object({
  standard: z.string(),
  expectedFrom: z.string(),
  criteria: z.array(wcag22CriterionSchema),
  alreadyFailing: z.number(),
  needsReview: z.number(),
  total: z.number(),
  parsingNoLongerCounts: z.boolean(),
});

export const conformanceSummarySchema = z.object({
  standard: z.string(),
  failed: z.number(),
  noIssuesFound: z.number(),
  needsReview: z.number(),
  total: z.number(),
  failedByLevel: z.object({ A: z.number(), AA: z.number() }),
  criteria: z.array(criterionResultSchema),
});
export type ConformanceSummaryReport = z.infer<typeof conformanceSummarySchema>;

export const accessibilityReportSchema = z.object({
  url: z.string(),
  scannedAt: z.string(),
  score: z.number(),
  // summary and score are both computed from category:"accessibility"
  // findings only — see services/merge/scoring.ts.
  summary: severitySummarySchema,
  categorySummary: categorySummarySchema,
  findings: z.array(accessibilityFindingSchema),
  // Optional so an older client (or a render where the walk failed) still
  // validates — the widget hides the preview when it's absent.
  screenReaderScript: screenReaderScriptSchema.optional(),
  // Optional so an older client still validates.
  conformance: conformanceSummarySchema.optional(),
  wcag22: wcag22ReadinessSchema.optional(),
  // Downscaled base64 JPEG of the page as a sighted visitor first sees it.
  // Powers the vision simulators in the widget, which re-filter this one
  // image client-side rather than asking the server to render variants.
  /**
   * What the engine checked and could not settle, for a person to judge.
   *
   * Deliberately not findings. A finding is a fault we are willing to state,
   * and these are the cases axe refuses to state precisely so that its
   * violations can be trusted — text over a photograph, a video it cannot
   * watch. Turning them into findings would import exactly the false
   * positives that discipline exists to prevent, and inflate a count the
   * score is computed from.
   *
   * They are also not nothing, which is what they were until now. Dropping
   * the array made a page with ninety-five undecided contrast pairs look
   * identical to one with none.
   *
   * Named for the engine's uncertainty rather than "needs review", which is
   * already the conformance table's word for a WCAG criterion nothing decided.
   * Two different questions, and they should not share a name.
   */
  // The menu as it appeared, in order. Carried per page purely so the
  // crawler can compare pages against each other for WCAG 3.2.3 and 3.2.4 —
  // a single page cannot be inconsistent with itself, so the widget shows
  // nothing from this on a one-page scan.
  navigation: z
    .array(z.object({ text: z.string(), href: z.string() }))
    .optional(),
  undecidedChecks: z
    .array(
      z.object({
        ruleId: z.string(),
        // How many places on the page the engine could not settle.
        count: z.number(),
        help: z.string(),
        helpUrl: z.string().optional(),
      })
    )
    .optional(),
  pagePreview: z.string().optional(),
  // The same preview with the consent layer hidden — present only when a
  // banner was detected, so the report can show the page rather than the
  // wall wherever that is the honest choice (the vision simulator).
  pagePreviewBehindConsent: z.string().optional(),
  meta: z.object({
    axeVersion: z.string(),
    renderTimeMs: z.number(),
    aiReviewTimeMs: z.number(),
    aiReviewStatus: aiReviewStatusSchema,
    // Checks that did not finish on this run. Present so the reader can tell a
    // clean result from an incomplete one — the score only counts what ran.
    incompleteChecks: z.array(z.string()).optional(),
    // Set when the thing checked was a document rather than a web page.
    documentKind: z.literal("pdf").optional(),
    documentPages: z.number().optional(),
    aiReviewErrorKind: aiReviewErrorKindSchema.optional(),
    model: z.string().optional(),
  }),
});
export type AccessibilityReport = z.infer<typeof accessibilityReportSchema>;
