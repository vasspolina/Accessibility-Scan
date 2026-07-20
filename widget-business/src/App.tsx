import { useMemo, useState } from "react";
import { UrlForm } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReportSection } from "./components/ReportSection";
import { PrincipleGroup } from "./components/PrincipleGroup";
import { WCAG_LINK } from "./lib/wcagPlain";
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
      <p className="a11y-intro">
        A website that's hard to use for people with disabilities turns away customers and can carry
        real legal risk. This check is based on the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>
        , the standard most accessibility laws are built on.
      </p>

      <UrlForm onSubmit={handleScan} loading={loading} />

      {error && (
        <p className="a11y-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="a11y-loading" role="status">
          Checking your site — this can take up to 30 seconds…
        </p>
      )}

      {report && (
        <div className="a11y-report">
          <ScoreGauge score={report.score} summary={report.summary} />

          {report.meta.aiReviewStatus !== "completed" && (
            <p className="a11y-notice">
              The AI-powered review wasn't included in this check
              {report.meta.aiReviewStatus === "disabled_by_request"
                ? " (turned off)."
                : report.meta.aiReviewStatus === "skipped_no_key"
                  ? " (not set up yet)."
                  : " (temporarily unavailable)."}{" "}
              Showing rule-based findings only.
            </p>
          )}

          <ReportSection
            title="Issues that could turn away customers"
            description="Marketing or design tricks that pressure or confuse people — these don't affect the score above, but they can cost you trust and sales."
            variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
            findings={findingsByCategory.darkPattern}
          />

          <section className="a11y-section">
            <h3 className="a11y-section-title">
              Accessibility issues, organized by the four WCAG principles{" "}
              <span className="a11y-section-count">({findingsByCategory.accessibility.length})</span>
            </h3>
            <p className="a11y-section-desc">
              Every WCAG rule falls under one of four principles — content should be Perceivable,
              Operable, Understandable, and Robust. Read more at{" "}
              <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
                w3.org/WAI
              </a>
              .
            </p>
            <PrincipleGroup findings={findingsByCategory.accessibility} />
          </section>

          <ReportSection
            title="Design & clarity notes"
            description="Visual or content clarity issues spotted on the page — not formal WCAG violations, but worth a look."
            variant="default"
            findings={findingsByCategory.designClarity}
          />
        </div>
      )}
    </div>
  );
}
