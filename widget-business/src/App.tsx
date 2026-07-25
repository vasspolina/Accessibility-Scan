import { useMemo, useState } from "react";
import { UrlForm, type ScanMode } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReportSection } from "./components/ReportSection";
import { PrincipleGroup } from "./components/PrincipleGroup";
import { ScreenReaderPreview } from "./components/ScreenReaderPreview";
import { ConformanceView } from "./components/ConformanceView";
import { VisionSimulator } from "./components/VisionSimulator";
import { SiteAuditView } from "./components/SiteAuditView";
import { AccessibilityStatement } from "./components/AccessibilityStatement";
import { PrintButton } from "./components/PrintButton";
import { WCAG_LINK } from "./lib/wcagPlain";
import {
  scanUrl,
  auditSite,
  ScanError,
  type AccessibilityReport,
  type SiteAudit,
} from "./api/scanClient";

export function App({ apiBase }: { apiBase: string }) {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [loading, setLoading] = useState(false);
  // Tracked so the wait message can be honest about which path is running —
  // the AI review roughly triples the time.
  const [aiRequested, setAiRequested] = useState(false);
  const [mode, setMode] = useState<ScanMode>("page");
  const [error, setError] = useState<string | null>(null);

  const findingsByCategory = useMemo(() => {
    const findings = report?.findings ?? [];
    return {
      accessibility: findings.filter((f) => f.category === "accessibility"),
      darkPattern: findings.filter((f) => f.category === "dark-pattern"),
      designClarity: findings.filter((f) => f.category === "design-clarity"),
    };
  }, [report]);

  async function handleScan(
    url: string,
    includeAiReview: boolean,
    mode: ScanMode,
    maxPages: number
  ) {
    setAiRequested(includeAiReview);
    setMode(mode);
    setLoading(true);
    setError(null);
    setReport(null);
    setAudit(null);
    try {
      if (mode === "site") {
        setAudit(await auditSite(apiBase, url, maxPages));
      } else {
        setReport(await scanUrl(apiBase, url, includeAiReview));
      }
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="a11y-widget-inner">
      <p className="a11y-intro">
        If people with a disability can't use your website, you lose them as customers — and in
        many countries you're breaking the law. This check is based on the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>
        , the rulebook nearly every accessibility law is built on.
      </p>

      <UrlForm onSubmit={handleScan} loading={loading} />

      {error && (
        <p className="a11y-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="a11y-loading" role="status">
          {mode === "site"
            ? "Auditing your site — checking each page in turn, this takes a few minutes…"
            : aiRequested
              ? "Checking your site, including the AI review — this can take up to a minute…"
              : "Checking your site — this usually takes about 15 seconds…"}
        </p>
      )}

      {audit && (
        <>
          <PrintButton label="Save the audit as PDF" />
          <SiteAuditView audit={audit} />
        </>
      )}

      {report && (
        <div className="a11y-report">
          <PrintButton />
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
            description="Ways your site might be pushing people into things rather than letting them choose. These don't change the score above, but they are what makes visitors stop trusting a business."
            variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
            findings={findingsByCategory.darkPattern}
          />

          <section className="a11y-section">
            <h3 className="a11y-section-title">
              Accessibility issues, organized by the four WCAG principles{" "}
              <span className="a11y-section-count">({findingsByCategory.accessibility.length})</span>
            </h3>
            <p className="a11y-section-desc">
              Everything below is grouped by the four questions the standard asks about any
              website: can people see it, use it, understand it, and will it keep working. Read
              more at{" "}
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
            description="Things that make your writing harder work to read: text too small, lines too close together, whole sentences in capitals. None of these break the law. They quietly cost you readers anyway — especially anyone with dyslexia, ADHD or weaker eyesight."
            variant="default"
            findings={findingsByCategory.designClarity}
          />

          <AccessibilityStatement report={report} />
        </div>
      )}
    </div>
  );
}
