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
  description: z.string(),
  suggestedFix: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
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
  meta: z.object({
    axeVersion: z.string(),
    renderTimeMs: z.number(),
    aiReviewTimeMs: z.number(),
    aiReviewStatus: aiReviewStatusSchema,
    model: z.string().optional(),
  }),
});
export type AccessibilityReport = z.infer<typeof accessibilityReportSchema>;
