export type Severity = "critical" | "serious" | "moderate" | "minor";
export type FindingSource = "automated" | "ai-review";
export type FindingCategory = "accessibility" | "design-clarity" | "dark-pattern";
export type AiReviewStatus = "completed" | "skipped_no_key" | "skipped_timeout" | "skipped_error";

export interface AccessibilityFinding {
  id: string;
  source: FindingSource;
  severity: Severity;
  category: FindingCategory;
  wcagCriterion?: string;
  selector: string;
  elementSnippet?: string;
  description: string;
  suggestedFix: string;
  ruleId?: string;
  confidence?: "high" | "medium" | "low";
}

export interface AccessibilityReport {
  url: string;
  scannedAt: string;
  score: number;
  summary: { critical: number; serious: number; moderate: number; minor: number; total: number };
  categorySummary: { accessibility: number; designClarity: number; darkPattern: number };
  findings: AccessibilityFinding[];
  meta: {
    axeVersion: string;
    renderTimeMs: number;
    aiReviewTimeMs: number;
    aiReviewStatus: AiReviewStatus;
    model?: string;
  };
}

export class ScanError extends Error {}

export async function scanUrl(apiBase: string, url: string): Promise<AccessibilityReport> {
  let response: Response;
  try {
    response = await fetch(`${apiBase.replace(/\/$/, "")}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ScanError("Could not reach the scanner service. Please try again shortly.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new ScanError(body.error ?? `Scan failed with status ${response.status}`);
  }

  return response.json();
}
