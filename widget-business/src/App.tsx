import { useMemo, useState } from "react";
import { UrlForm } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReportSection } from "./components/ReportSection";
import { PrincipleGroup } from "./components/PrincipleGroup";
import { ScreenReaderPreview } from "./components/ScreenReaderPreview";
import { ConformanceView } from "./components/ConformanceView";
import { VisionSimulator } from "./components/VisionSimulator";
import { WCAG_LINK } from "./lib/wcagPlain";
import { scanUrl, ScanError, type AccessibilityReport } from "./api/scanClient";

export function App({ apiBase }: { apiBase: string }) {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  // Tracked so the wait message can be honest about which path is running —
  // the AI review roughly triples the time.
  const [aiRequested, setAiRequested] = useState(false);
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
    setAiRequested(includeAiReview);
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
        A website that's hard to use for people with disabilities turns away users and can carry
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
          {aiRequested
            ? "Checking your site, including the AI review — this can take up to a minute…"
            : "Checking your site — this usually takes about 15 seconds…"}
        </p>
      )}

      {report && (
        <div className="a11y-report">
          <ScoreGauge score={report.score} summary={report.summary} />

          {/* Only flag it when the AI review was wanted but didn't happen.
              "disabled_by_request" is the visitor's own choice — reporting it
              back as a shortfall would put a warning on every default scan. */}
          {report.meta.aiReviewStatus !== "completed" &&
            report.meta.aiReviewStatus !== "disabled_by_request" && (
              <p className="a11y-notice">
                The AI-powered review wasn't included in this check
                {report.meta.aiReviewStatus === "skipped_no_key"
                  ? " (not set up yet)."
                  : " (temporarily unavailable)."}{" "}
                Showing rule-based findings only.
              </p>
            )}

          {report.conformance && <ConformanceView conformance={report.conformance} />}

          <ReportSection
            title="Issues that could turn away users"
            description="Marketing or design tricks that pressure or confuse people — these don't affect the score above, but they can cost you trust and credibility."
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

          {report.pagePreview && (
            <VisionSimulator pagePreview={report.pagePreview} url={report.url} />
          )}

          {report.screenReaderScript && (
            <ScreenReaderPreview script={report.screenReaderScript} />
          )}

          <ReportSection
            title="Design & clarity notes"
            description="Visual and readability issues spotted on the page — typography details like letter spacing, line length, line spacing, italics, and all-caps, drawn from classic typographic practice and neurodiversity research (GOV.UK's accessibility guidance and the Neurodiversity Design System). Not formal WCAG violations, but they shape how readable your site feels — especially for people with dyslexia, ADHD, or low vision."
            variant="default"
            findings={findingsByCategory.designClarity}
          />
        </div>
      )}
    </div>
  );
}
