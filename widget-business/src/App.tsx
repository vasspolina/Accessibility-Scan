import { useEffect, useMemo, useState } from "react";
import { UrlForm, type ScanMode } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { DocumentSummary } from "./components/DocumentSummary";
import { ReportSection } from "./components/ReportSection";
import { PrincipleGroup } from "./components/PrincipleGroup";
import { UndecidedChecks } from "./components/UndecidedChecks";
import { ScreenReaderPreview } from "./components/ScreenReaderPreview";
import { ConformanceView } from "./components/ConformanceView";
import { Wcag22Readiness } from "./components/Wcag22Readiness";
import { VisionSimulator } from "./components/VisionSimulator";
import { SiteAuditView } from "./components/SiteAuditView";
import { AccessibilityStatement } from "./components/AccessibilityStatement";
import { AcrDraft } from "./components/AcrDraft";
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

/**
 * What to say while waiting, as a function of how long it has been.
 *
 * Returns the same string for long stretches on purpose. The element holding
 * it is a live region, so a screen reader re-announces whenever the text
 * changes — a message that mentioned the running count would speak every
 * second. Changing only at milestones means an update arrives when there is
 * actually news.
 *
 * The thresholds come from measurement rather than optimism. A light page
 * finishes in about twenty seconds, moma.org takes forty, and the Guardian
 * has taken eighty. "About 15 seconds" was true of the fixtures and of
 * nothing else, and a promise that expires while the user watches is worse
 * than no promise.
 */
export function waitingMessage(mode: ScanMode, aiRequested: boolean, elapsed: number): string {
  if (mode === "site") {
    return "Auditing your site. Checking each page in turn, so this takes a few minutes…";
  }
  if (elapsed >= 60) {
    return "Still going. This one is unusually heavy — a page of large images can take a while to load and measure.";
  }
  if (elapsed >= 25) {
    return aiRequested
      ? "Still going. The AI review is the slow part, and it is nearly always worth the wait."
      : "Still going. Heavier pages take longer, and this one is on the heavier side.";
  }
  return aiRequested
    ? "Checking your site, including the AI review. That usually takes about a minute…"
    : "Checking your site. Most pages take twenty to forty seconds…";
}

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
  // Seconds since the scan began, and how long the last one took.
  //
  // Worth showing because the honest answer is "it depends". A light page
  // finishes in about twenty seconds and a heavy one has taken eighty, and a
  // message promising fifteen while nothing moves reads as a hang. A number
  // that keeps counting is the difference between waiting and wondering.
  const [elapsed, setElapsed] = useState(0);
  const [tookSeconds, setTookSeconds] = useState<number | null>(null);

  // A PDF is checked for a handful of structural things, not crawled as a
  // page, so several sections of the report simply do not apply to it.
  const isDocument = report?.meta.documentKind === "pdf";

  // Ticks once a second while a scan runs, and stops when it does.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

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
    setTookSeconds(null);
    const startedAt = Date.now();
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
      setTookSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setLoading(false);
    }
  }

  return (
    // A landmark, so everything the widget renders sits inside something a
    // screen-reader user can find and skip. Without it our content counted as
    // orphaned page content, which is a rule this product reports on others.
    //
    // <section aria-label> rather than <main>: the widget is a guest on
    // somebody else's page, and that page's own <main> is not ours to claim.
    <section className="a11y-widget-inner" aria-label="Website accessibility check">
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
        <p className="a11y-loading">
          {/* Two parts, deliberately. The words are a live region and change
              only at milestones; the seconds tick outside it and are hidden
              from assistive technology.

              A counter inside a live region announces itself every second,
              which would make this tool's own waiting screen the most
              irritating thing a screen reader user met all day — on a product
              whose entire subject is not doing that. Sighted users get the
              reassurance of a moving number; everyone else gets an update
              when there is genuinely something new to say. */}
          <span role="status">{waitingMessage(mode, aiRequested, elapsed)}</span>{" "}
          <span className="a11y-elapsed" aria-hidden="true">
            {elapsed}s
          </span>
        </p>
      )}

      {/* Announces the outcome to anyone not watching the screen.
          The loading paragraph above is a live region too, but it is unmounted
          the moment results arrive, and a live region that disappears announces
          nothing. So a screen-reader user heard "Checking your site…" and then
          silence, with a full report sitting on screen unannounced. On a tool
          built for exactly this audience that was the worst thing in the UI.

          Kept mounted and separate from the results so the text changing is
          what triggers the announcement, and visually hidden because sighted
          users already have the score in front of them. */}
      <p className="a11y-sr-only" role="status">
        {loading
          ? ""
          : report
            ? `Check complete in ${tookSeconds ?? 0} seconds. Score ${report.score} out of 100, ${
                report.summary.total
              } ${report.summary.total === 1 ? "issue" : "issues"} found. The full report follows.`
            : audit
              ? `Site audit complete. ${audit.pagesScanned} ${
                  audit.pagesScanned === 1 ? "page" : "pages"
                } checked, average score ${audit.averageScore} out of 100. The full report follows.`
              : ""}
      </p>

      {audit && (
        <>
          <PrintButton label="Save the audit as PDF" />
          <SiteAuditView audit={audit} />
        </>
      )}

      {report && (
        <div className="a11y-report">
          <PrintButton />
          {isDocument ? (
            <DocumentSummary report={report} />
          ) : (
            <ScoreGauge score={report.score} summary={report.summary} seed={report.scannedAt} />
          )}

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

          {/* The score only counts checks that ran, so a scan where some fell
              over can look better than a complete one. Measured on a real site:
              three identical scans scored 4, 24 and 24, purely because the
              keyboard and phone-layout checks gave up on two of them. Saying so
              is the difference between a number and a trustworthy number. */}
          {report.meta.incompleteChecks && report.meta.incompleteChecks.length > 0 && (
            <p className="a11y-notice">
              Some checks didn't finish this time:{" "}
              {report.meta.incompleteChecks.join(", ")}. The score above only counts what ran,
              so it may look better than it should. Running the check again usually completes them.
            </p>
          )}

          <ScanHistory current={toHistoryEntry(report)} previous={history} />

          {report.conformance && <ConformanceView conformance={report.conformance} />}

          {report.wcag22 && <Wcag22Readiness readiness={report.wcag22} />}

          {!isDocument && (
          <ReportSection
            title="Issues that could turn away users"
            description="Places your site nudges people instead of letting them choose. These don't move the score. They move how much you're trusted."
            variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
            findings={findingsByCategory.darkPattern}
          />
          )}

          <section className="a11y-section">
            <h3 className="a11y-section-title">
              What people can't use{" "}
              <span className="a11y-section-count">({findingsByCategory.accessibility.length})</span>
            </h3>
            <p className="a11y-section-desc">
              {isDocument
                ? "What stops this document being read aloud, grouped by the four questions the standard asks. More at "
                : "Grouped by the four questions the standard asks: can people see it, use it, understand it, and will it keep working. More at "}
              <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
                w3.org/WAI
              </a>
              .
            </p>
            <PrincipleGroup findings={findingsByCategory.accessibility} />
          </section>

          {report.undecidedChecks && report.undecidedChecks.length > 0 && (
            <UndecidedChecks rows={report.undecidedChecks} />
          )}

          {!isDocument && (
          <ReportSection
            title="Design & clarity notes"
            description="Type that works against the reader: too small, too tight, too many capitals. None of it is illegal. All of it costs you readers, and dyslexic ones first."
            variant="default"
            findings={findingsByCategory.designClarity}
          />
          )}

          {/* The two "see and hear it yourself" views, kept together and below
              every finding. They used to sit in the middle of the report, which
              put a large picture between the accessibility findings and the
              design notes and broke the run of things to act on. Nothing here
              is a finding — it is somewhere to look once the list is read. */}
          {report.pagePreview && (
            <VisionSimulator pagePreview={report.pagePreview} url={report.url} />
          )}

          {report.screenReaderScript && (
            <ScreenReaderPreview script={report.screenReaderScript} />
          )}

          {!isDocument && <AccessibilityStatement report={report} />}

          {!isDocument && <AcrDraft report={report} />}
        </div>
      )}
    </section>
  );
}
