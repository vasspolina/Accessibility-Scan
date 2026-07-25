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
import { BlockedNotice } from "./components/BlockedNotice";
import { ScanHistory } from "./components/ScanHistory";
import { PrintButton } from "./components/PrintButton";
import { WCAG_LINK } from "./lib/wcagPlain";
import {
  recordScan,
  getHistory,
  toHistoryEntry,
  type HistoryEntry,
} from "./lib/scanHistory";
import {
  scanUrl,
  auditSite,
  ScanError,
  type AccessibilityReport,
  type SiteAudit,
  type AuthConfig,
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
  // A site turning the scanner away isn't the visitor's mistake, so it's shown
  // as guidance rather than a red error.
  const [blocked, setBlocked] = useState<string | null>(null);
  // Earlier scans of the page just checked, read before this one is recorded
  // so the current scan isn't compared against itself.
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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
    maxPages: number,
    auth?: AuthConfig
  ) {
    setAiRequested(includeAiReview);
    setMode(mode);
    setLoading(true);
    setError(null);
    setBlocked(null);
    setReport(null);
    setAudit(null);
    setHistory([]);
    try {
      if (mode === "site") {
        setAudit(await auditSite(apiBase, url, maxPages));
      } else {
        const result = await scanUrl(apiBase, url, includeAiReview, auth);
        // Read before recording, so "since last time" compares against the
        // previous run rather than this one.
        setHistory(getHistory(result.url, result.scannedAt));
        recordScan(result, Boolean(auth));
        setReport(result);
      }
    } catch (err) {
      if (err instanceof ScanError && err.blocked) {
        setBlocked(err.message);
      } else {
        setError(err instanceof ScanError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="a11y-widget-inner">
      <p className="a11y-intro">
        A door that only opens for some people isn't a broken door. It's a badly designed one. The
        same goes for websites. This check follows the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>
        , the standard nearly every accessibility law is built on.
      </p>

      <UrlForm onSubmit={handleScan} loading={loading} />

      {blocked && <BlockedNotice message={blocked} />}

      {error && (
        <p className="a11y-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="a11y-loading" role="status">
          {mode === "site"
            ? "Auditing your site. Checking each page in turn, so this takes a few minutes…"
            : aiRequested
              ? "Checking your site, including the AI review. This can take up to a minute…"
              : "Checking your site. This usually takes about 15 seconds…"}
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

          <ScanHistory current={toHistoryEntry(report)} previous={history} />

          {report.conformance && <ConformanceView conformance={report.conformance} />}

          <ReportSection
            title="Issues that could turn away users"
            description="Places your site nudges people instead of letting them choose. These don't move the score. They move how much you're trusted."
            variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
            findings={findingsByCategory.darkPattern}
          />

          <section className="a11y-section">
            <h3 className="a11y-section-title">
              What people can't use{" "}
              <span className="a11y-section-count">({findingsByCategory.accessibility.length})</span>
            </h3>
            <p className="a11y-section-desc">
              Grouped by the four questions the standard asks: can people see it, use it,
              understand it, and will it keep working. More at{" "}
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
            description="Type that works against the reader: too small, too tight, too many capitals. None of it is illegal. All of it costs you readers, and dyslexic ones first."
            variant="default"
            findings={findingsByCategory.designClarity}
          />

          <AccessibilityStatement report={report} />
        </div>
      )}
    </div>
  );
}
