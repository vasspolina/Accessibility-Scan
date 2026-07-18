import { useMemo, useState } from "react";
import { UrlForm } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReportSection } from "./components/ReportSection";
import { scanUrl, ScanError, type AccessibilityReport } from "./api/scanClient";

export function App({ apiBase }: { apiBase: string }) {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findingsByCategory = useMemo(() => {
    const findings = report?.findings ?? [];
    return {
      accessibility: findings.filter((f) => f.category === "accessibility"),
      darkPattern: findings.filter((f) => f.category === "dark-pattern"),
      designClarity: findings.filter((f) => f.category === "design-clarity"),
    };
  }, [report]);

  async function handleScan(url: string, includeAiReview: boolean) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await scanUrl(apiBase, url, includeAiReview);
      setReport(result);
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="a11y-widget-inner">
      <UrlForm onSubmit={handleScan} loading={loading} />

      {error && (
        <p className="a11y-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="a11y-loading" role="status">
          Scanning page — this can take up to 30 seconds…
        </p>
      )}

      {report && (
        <div className="a11y-report">
          <ScoreGauge score={report.score} summary={report.summary} />

          {report.meta.aiReviewStatus !== "completed" && (
            <p className="a11y-notice">
              AI judgment review was not included in this scan
              {report.meta.aiReviewStatus === "disabled_by_request"
                ? " (turned off)."
                : report.meta.aiReviewStatus === "skipped_no_key"
                  ? " (not configured)."
                  : " (temporarily unavailable)."}{" "}
              Showing automated findings only.
            </p>
          )}

          <ReportSection
            title="Red flags — marketing tricks & confusing loops"
            description="Manipulative or deceptive UX patterns that pressure or confuse customers. These don't affect the accessibility score above, but they're worth fixing for trust and conversion."
            variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
            findings={findingsByCategory.darkPattern}
          />

          <ReportSection
            title="Accessibility issues"
            description="Findings that affect people using assistive technology, grouped by severity."
            variant="default"
            findings={findingsByCategory.accessibility}
          />

          <ReportSection
            title="Design & clarity notes"
            description="Visual or content clarity issues spotted in the page screenshot — not WCAG violations, but worth a look."
            variant="default"
            findings={findingsByCategory.designClarity}
          />
        </div>
      )}
    </div>
  );
}
