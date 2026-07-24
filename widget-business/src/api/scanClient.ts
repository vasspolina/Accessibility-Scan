export type Severity = "critical" | "serious" | "moderate" | "minor";
export type FindingSource = "automated" | "ai-review";
export type FindingCategory = "accessibility" | "design-clarity" | "dark-pattern";
export type WcagLevel = "A" | "AA" | "AAA";
export type AiReviewStatus =
  | "completed"
  | "skipped_no_key"
  | "skipped_timeout"
  | "skipped_error"
  | "disabled_by_request";

export interface AccessibilityFinding {
  id: string;
  source: FindingSource;
  severity: Severity;
  category: FindingCategory;
  wcagCriterion?: string;
  wcagLevel?: WcagLevel;
  selector: string;
  elementSnippet?: string;
  description: string;
  suggestedFix: string;
  ruleId?: string;
  // Link to the official explanation of the rule (axe help page or W3C
  // guidance), shown as a "Learn more" link.
  helpUrl?: string;
  confidence?: "high" | "medium" | "low";
  // Base64 JPEG (no data: prefix) — a cropped screenshot of the flagged
  // element, when the backend could locate and capture it.
  elementScreenshot?: string;
  // AI-suggested alt text for an image that's missing one. A non-empty
  // string is ready-to-use alt text; an empty string means the image looks
  // decorative and should get alt=""; undefined means none was generated.
  suggestedAltText?: string;
}

// One announcement in the screen-reader preview. An approximation of what a
// screen reader says at this point in the page, not a recording of a specific
// product — see the backend's analyzeScreenReader.ts.
export interface ScreenReaderLine {
  text: string;
  kind:
    | "landmark"
    | "heading"
    | "link"
    | "button"
    | "image"
    | "field"
    | "list"
    | "table"
    | "frame"
    | "text";
  selector: string;
  // Present when this announcement reveals a problem worth highlighting.
  issue?: string;
}

export interface ScreenReaderScript {
  lines: ScreenReaderLine[];
  truncated: boolean;
}

export interface AccessibilityReport {
  url: string;
  scannedAt: string;
  score: number;
  summary: { critical: number; serious: number; moderate: number; minor: number; total: number };
  categorySummary: { accessibility: number; designClarity: number; darkPattern: number };
  findings: AccessibilityFinding[];
  // Optional — absent on older backends or when the reading-order walk failed.
  screenReaderScript?: ScreenReaderScript;
  meta: {
    axeVersion: string;
    renderTimeMs: number;
    aiReviewTimeMs: number;
    aiReviewStatus: AiReviewStatus;
    model?: string;
  };
}

export class ScanError extends Error {}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gateway/unavailable statuses that occur briefly while the backend is
// restarting (e.g. during a deploy) — worth a quick retry rather than an
// error. Rate-limit (429) and real 4xx/5xx are NOT retried; they carry a
// meaningful message the user should see.
const TRANSIENT_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;

export async function scanUrl(
  apiBase: string,
  url: string,
  includeAiReview: boolean
): Promise<AccessibilityReport> {
  const endpoint = `${apiBase.replace(/\/$/, "")}/api/scan`;
  const body = JSON.stringify({ url, includeAiReview });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch {
      // Connection failure — the service may just be briefly restarting.
      // Retry a couple of times before giving up.
      if (attempt < MAX_ATTEMPTS) {
        await delay(1500 * attempt);
        continue;
      }
      throw new ScanError("Could not reach the scanner service. Please try again shortly.");
    }

    if (TRANSIENT_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      await delay(1500 * attempt);
      continue;
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}) as { error?: string });
      throw new ScanError(errBody.error ?? `Scan failed with status ${response.status}`);
    }

    return response.json();
  }

  throw new ScanError("Could not reach the scanner service. Please try again shortly.");
}
