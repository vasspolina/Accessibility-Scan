import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { t } from "./lib/strings";
import type { RefObject } from "react";
import { flushSync } from "react-dom";
import { UrlForm, type ScanMode } from "./components/UrlForm";
import { ScoreGauge } from "./components/ScoreGauge";
import { ReportActions } from "./components/ReportActions";
import { ScanSettings } from "./components/ScanSettings";
import { AppShell } from "./components/AppShell";
import type { Plan } from "./components/PlansBar";
import type { NavSection } from "./components/SideNav";
import { useActiveSection } from "./lib/useActiveSection";
import { DocumentSummary } from "./components/DocumentSummary";
import { ReportSection } from "./components/ReportSection";
import { DesignNotesPanel } from "./components/DesignNotesPanel";
import { PrincipleGroup } from "./components/PrincipleGroup";
import { UndecidedChecks } from "./components/UndecidedChecks";
import { ReportViewProvider, type ReportView } from "./components/ReportViewContext";
import { ProfessionalTable } from "./components/ProfessionalTable";
import { ProSummary, type ProView } from "./components/ProSummary";
import { Tabs } from "./components/Tabs";
import { Notification, ProgressBar } from "./components/Feedback";
import { groupFindings } from "./components/FindingsList";
import { SCAN_DURATION } from "./lib/scanDuration";
import { ScanChat, type ChatApi, type ScanOutcome } from "./components/ScanChat";
import { PAGE_ORDER, type SectionKey } from "./lib/sections";
import {
  NARRATION_STEPS,
  narrationIndex,
  narrationLabel,
  newProgressId,
  watchScanProgress,
} from "./lib/scanNarration";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
import {
  loadAudienceMode,
  saveAudienceMode,
  matchesFixFilter,
  type AudienceMode,
  type FixFilter,
} from "./lib/audienceMode";
import { ScreenReaderPreview } from "./components/ScreenReaderPreview";
import { ConformanceView } from "./components/ConformanceView";
import { Wcag22Readiness } from "./components/Wcag22Readiness";
import { VisionSimulator } from "./components/VisionSimulator";
import { SiteAuditView } from "./components/SiteAuditView";
import { AccessibilityStatement } from "./components/AccessibilityStatement";
import { AcrDraft } from "./components/AcrDraft";
import { BlockedNotice } from "./components/BlockedNotice";
import { ScanHistory } from "./components/ScanHistory";
import { ManualChecks } from "./components/ManualChecks";
import { AccountKey } from "./components/AccountKey";
import { ScheduleRow } from "./components/ScheduleRow";
import { getApiKey } from "./lib/apiKey";
import { getLang, setLang, storeLang, type Lang } from "./lib/i18n";
import { fetchServerHistory, type RecordedVerdict } from "./api/scanClient";
import { PrintButton } from "./components/PrintButton";
import { Button } from "./components/Button";
import { WCAG_LINK } from "./lib/wcagPlain";
import {
  SCORING_VERSION,
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
 * The thresholds come from measurement rather than optimism — see
 * lib/scanDuration.ts, which now holds the durations themselves so the form
 * and this message cannot tell a visitor two different things. They did for
 * months: the form said fifteen seconds, this said twenty to forty, and a
 * reader saw one before pressing the button and the other straight after.
 */
export function waitingMessage(mode: ScanMode, aiRequested: boolean, elapsed: number): string {
  if (mode === "site") {
    return `Site audit under way. Each page in turn, so this takes ${SCAN_DURATION.site}…`;
  }
  if (elapsed >= 60) {
    return "Still at it. This one is unusually heavy — a page of large images can take a while to load and measure.";
  }
  if (elapsed >= 25) {
    return aiRequested
      ? "Still at it. The AI review is the slow part, and it is nearly always worth the wait."
      : "Still at it. Heavier pages take longer, and this one is on the heavier side.";
  }
  return aiRequested
    ? "We check your site, including the AI review. That usually takes about a minute…"
    : `We check your site. Most pages take ${SCAN_DURATION.page}…`;
}

export interface CtaConfig {
  text: string;
  href: string;
}

export function App({
  apiBase,
  cta,
  plans,
}: {
  apiBase: string;
  cta?: CtaConfig;
  plans?: Plan[];
}) {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [loading, setLoading] = useState(false);
  // Tracked so the wait message can be honest about which path is running —
  // the AI review roughly triples the time.
  const [aiRequested, setAiRequested] = useState(false);
  const [mode, setMode] = useState<ScanMode>("page");
  // Presentation only — the scan is identical in both modes, and flipping
  // re-renders the report already in hand. Persisted so a returning visitor
  // keeps their choice.
  const [audience, setAudienceState] = useState<AudienceMode>(() => loadAudienceMode());
  const setAudience = (m: AudienceMode) => {
    setAudienceState(m);
    saveAudienceMode(m);
  };
  // The professional view filter. Reset to "all" is deliberate on mode
  // switch: a business reader must never inherit a hidden-cards state.
  const [fixFilter, setFixFilter] = useState<FixFilter>("all");
  const professional = audience === "professional";
  const [error, setError] = useState<string | null>(null);
  // A site turning the scanner away isn't the visitor's mistake, so it's shown
  // as guidance rather than a red error.
  const [blocked, setBlocked] = useState<string | null>(null);
  // Earlier scans of the page just checked, read before this one is recorded
  // so the current scan isn't compared against itself.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // The language, as state so a switch re-renders everything that reads
  // it. The module value is the source the accessors read; this mirrors it.
  const [lang, setLangState] = useState<Lang>(getLang());
  const changeLang = (next: Lang) => {
    setLang(next);
    storeLang(next);
    setLangState(next);
  };
  // Bumped when the account key changes, so anything read with it reloads.
  const [accountVersion, setAccountVersion] = useState(0);
  // Re-read when the key changes; getApiKey is a localStorage read.
  const signedIn = useMemo(() => Boolean(getApiKey()), [accountVersion]);
  // Seconds since the scan began, and how long the last one took.
  //
  // Worth showing because the honest answer is "it depends". A light page
  // finishes in about twenty seconds and a heavy one has taken eighty, and a
  // message promising fifteen while nothing moves reads as a hang. A number
  // that keeps counting is the difference between waiting and wondering.
  const [elapsed, setElapsed] = useState(0);
  const [tookSeconds, setTookSeconds] = useState<number | null>(null);
  // The scan's own narration: milestone ids as the backend crosses them,
  // in arrival order. Empty until the stream produces something, and the
  // waiting screen falls back to the elapsed-time story when it stays so
  // (an older backend, a proxy that refuses the stream) — the narration is
  // an upgrade, never a dependency.
  const [milestones, setMilestones] = useState<string[]>([]);
  // How a scan starts: by conversation, or by the form. The form stays —
  // it is the only way to scan behind a login, because a password typed
  // into the chat would pass through the model.
  const [entry, setEntry] = useState<"chat" | "form">("chat");
  // The ticking "12s" is reassurance, not essential status — the words
  // beside it carry the real information, and elapsed itself keeps driving
  // those words and the progress bar either way. WCAG 2.2.2 asks for a way
  // to stop content like this that starts on its own; the same preference
  // already freezes the spinner in styles.css, so honour it here too rather
  // than adding a separate control just for this one number.
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

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

  const reportView = useMemo<ReportView>(() => {
    const criterionNames: ReportView["criterionNames"] = {};
    for (const c of report?.conformance?.criteria ?? []) {
      criterionNames[c.id] = { name: c.name, level: c.level };
    }
    return { professional, criterionNames, apiBase, siteUrl: report?.url, signedIn: signedIn && Boolean(report?.savedAs) };
  }, [report, professional, apiBase, signedIn]);

  // Print must include every card whatever the on-screen filter shows — the
  // rule the conformance checklist already follows. The filter lives in React
  // state, so print CSS cannot undo it; instead it lifts for the duration of
  // the print and returns afterwards. flushSync because the browser takes its
  // snapshot as soon as the beforeprint handlers return.
  const printFilterRestore = useRef<FixFilter>("all");
  // The conversation, for re-runs and jumps asked for outside its thread.
  const chatApi = useRef<ChatApi | null>(null);
  // Which region the professional tabs show; the tabs live in the summary
  // grid (the reference's layout), the region renders full-width below.
  const [proView, setProView] = useState<ProView>("issues");
  // "New scan" in the professional action row: back to the form, focus
  // the field — the master file's button, wired to the one real action.
  const formRef: RefObject<HTMLDivElement> = useRef(null);
  const focusForm = () => {
    formRef.current?.scrollIntoView({ block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("#a11y-chat-input, #a11y-url-input")?.focus();
  };

  /* The one jump both navs use. A bare href="#id" does not reliably scroll
     from inside a shadow root, and scrolling without moving focus leaves a
     keyboard user's next Tab back where they started. */
  const jumpTo = (target: HTMLElement) => {
    /* Smooth only when motion is welcome. reducedMotion is the same value
       that already freezes the spinner and the elapsed ticker — read once,
       so the three cannot disagree. */
    const smooth = !reducedMotion;
    const before = window.scrollY;
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    /* Observed: some embedding contexts accept behavior:"smooth" and then
       never animate, so the page stays put while focus lands somewhere the
       reader cannot see — the worst of both. If nothing has moved shortly
       after, jump instantly instead. A target already in view scrolls to
       itself, which costs nothing. */
    if (smooth) {
      setTimeout(() => {
        if (Math.abs(window.scrollY - before) < 2) {
          target.scrollIntoView({ block: "start" });
        }
      }, 300);
    }
  };

  /* "See the N findings" — scroll AND move focus, the same pairing focusForm
     uses. */
  const focusFindings = (id = "a11y-accessibility-heading") => {
    const find = () => shellContentRef.current?.querySelector<HTMLElement>(`#${id}`);
    let target = find();
    // In the conversation the findings are a block that may not be in the
    // thread yet: the stop-press arrives with the scan, the findings after
    // the reply. Asked for now, and rendered before the focus moves.
    if (!target && entry === "chat" && chatApi.current) {
      flushSync(() => chatApi.current!.show("findings"));
      target = find();
    }
    // A folded block hides its heading from focus.
    for (let el = target?.parentElement; el; el = el.parentElement) {
      if (el instanceof HTMLDetailsElement) el.open = true;
    }
    target?.scrollIntoView({ block: "start" });
    target?.focus();
  };

  // The shell sidebar's section list, built by watching the content the
  // report actually renders rather than re-deriving its many conditionals
  // (audit/report/isDocument/professional/etc.) a second time here — every
  // `[data-nav-label]` element already carries the id and label it needs.
  const shellContentRef: RefObject<HTMLDivElement> = useRef(null);
  const [sections, setSections] = useState<NavSection[]>([]);
  useEffect(() => {
    const root = shellContentRef.current;
    if (!root) return;
    const collect = () => {
      const els = Array.from(root.querySelectorAll<HTMLElement>("[data-nav-label]"));
      setSections(
        els
          // Rendered ones only. In professional mode the card sections are
          // print-only (display:none on screen), and the rail listed them
          // anyway — two links that jumped to nothing visible. offsetParent
          // is null under a display:none ancestor.
          .filter((el) => el.id && el.offsetParent !== null)
          .map((el) => ({ id: el.id, el, label: el.dataset.navLabel ?? "" }))
      );
    };
    collect();
    const observer = new MutationObserver(collect);
    // Attributes too: a language switch rewrites every data-nav-label in
    // place, with no child added or removed, and the rail kept the old
    // language until something else changed.
    // "class" too: the audience switch flips the print-only wrapper's class,
    // which is what hides or shows those sections.
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-nav-label", "class"] });
    return () => observer.disconnect();
  }, []);
  const activeSectionId = useActiveSection(sections);
  useEffect(() => {
    const before = () => {
      printFilterRestore.current = fixFilter;
      if (fixFilter !== "all") flushSync(() => setFixFilter("all"));
    };
    const after = () => {
      if (printFilterRestore.current !== "all") setFixFilter(printFilterRestore.current);
      printFilterRestore.current = "all";
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [fixFilter]);

  const proIssueGroups = useMemo(
    () =>
      report
        ? groupFindings([
            ...(report.findings ?? []),
          ]).length
        : 0,
    [report]
  );
  const proCleanCount =
    report?.conformance?.criteria.filter((c) => c.status === "no-issues-found").length ?? 0;

  const findingsByCategory = useMemo(() => {
    const all = report?.findings ?? [];
    // The professional filter narrows the view, never the data: exports,
    // history and the score are computed from the full report regardless.
    const findings = professional ? all.filter((f) => matchesFixFilter(f, fixFilter)) : all;
    return {
      accessibility: findings.filter((f) => f.category === "accessibility"),
      darkPattern: findings.filter((f) => f.category === "dark-pattern"),
      designClarity: findings.filter((f) => f.category === "design-clarity"),
    };
  }, [report, professional, fixFilter]);

  async function handleScan(
    url: string,
    includeAiReview: boolean,
    mode: ScanMode,
    maxPages: number,
    auth?: AuthConfig
  ): Promise<ScanOutcome> {
    let outcome: ScanOutcome = { kind: "error", message: t("Something went wrong. Please try again.") };
    setAiRequested(includeAiReview);
    setMode(mode);
    setLoading(true);
    const startedAt = Date.now();
    setError(null);
    setBlocked(null);
    // The page reading shows one result at a time: the old one goes as the
    // new scan starts, and a failure leaves only the notice. The
    // conversation keeps the earlier result until a new one lands — its
    // blocks are keyed to it and the assistant still holds its digest, so a
    // scan that fails or is blocked must not take it away.
    if (entry === "form") {
      setTookSeconds(null);
      setReport(null);
      setAudit(null);
      setHistory([]);
    }
    setMilestones([]);
    // The stream opens before the request: whichever side arrives first at
    // the channel creates it, and a late subscriber gets the backlog anyway.
    // Page scans only — the audit is many scans, and narrating one of them
    // as if it were the whole would be a lie of the polite kind.
    const progressId = mode === "site" ? undefined : newProgressId();
    const closeProgress = progressId
      ? watchScanProgress(apiBase, progressId, (id) =>
          setMilestones((prev) => (prev.includes(id) ? prev : [...prev, id]))
        )
      : () => {};
    try {
      if (mode === "site") {
        const result = await auditSite(apiBase, url, maxPages);
        setReport(null);
        setHistory([]);
        setAudit(result);
        setTookSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        outcome = { kind: "audit", audit: result };
      } else {
        const result = await scanUrl(apiBase, url, includeAiReview, auth, progressId);
        // Read before recording, so "since last time" compares against the
        // previous run rather than this one.
        setHistory(getHistory(result.url, result.scannedAt));
        recordScan(result, Boolean(auth));
        setAudit(null);
        setReport(result);
        setTookSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        outcome = { kind: "report", report: result };
        // A saved scan has a server-side history too, which follows the
        // account rather than this browser. It replaces the local one when
        // it exists; the local one stays the answer for anonymous scans.
        if (result.savedAs) {
          fetchServerHistory(apiBase, result.url)
            .then((scans) =>
              setHistory(
                scans
                  .filter((s) => s.id !== result.savedAs)
                  .map((s) => ({
                    url: s.url,
                    scannedAt: s.scannedAt,
                    score: s.score,
                    critical: s.severity.critical,
                    serious: s.severity.serious,
                    moderate: s.severity.moderate,
                    minor: s.severity.minor,
                    conformanceFailed: s.conformanceFailed,
                    ruleIds: s.ruleIds,
                    scoringVersion: SCORING_VERSION,
                  }))
              )
            )
            .catch(() => {
              // The local history is already showing; the server's is an
              // improvement, not a requirement.
            });
        }
      }
    } catch (err) {
      if (err instanceof ScanError && err.blocked) {
        setBlocked(err.message);
        outcome = { kind: "blocked", message: err.message };
      } else {
        const message = err instanceof ScanError ? err.message : t("Something went wrong. Please try again.");
        setError(message);
        outcome = { kind: "error", message };
      }
    } finally {
      setLoading(false);
      closeProgress();
    }
    return outcome;
  }

  // The run's settings: report style, the re-run switches, the account key
  // and the schedule. The rail carries them in the page reading; the
  // conversation shows them as a block when asked.
  const settingsNode =
    report || audit ? (
      <>
        <ScanSettings
          audience={audience}
          onAudienceChange={setAudience}
          aiIncluded={report?.meta.aiReviewStatus === "completed"}
          // The result on screen, not the last attempt: a failed site audit in
          // the conversation leaves the page report up, and `mode` behind it.
          scope={audit ? "site" : "page"}
          busy={loading}
          language={lang}
          onLanguageChange={changeLang}
          onRerun={({ ai, scope }) => {
            const url = report?.url ?? audit?.pages[0]?.url;
            if (!url) return;
            const aiOn = ai ?? report?.meta.aiReviewStatus === "completed";
            const shown: ScanMode = audit ? "site" : "page";
            // In the conversation the re-run is a turn in the thread.
            if (entry === "chat" && chatApi.current) chatApi.current.rerun(url, scope ?? shown, aiOn);
            else handleScan(url, aiOn, scope ?? shown, 5);
          }}
        />
        <AccountKey apiBase={apiBase} onChange={() => setAccountVersion((v) => v + 1)} />
        {/* Only for a saved scan: a schedule belongs to an account, and the
            row needs the page it is about. */}
        {report?.savedAs && signedIn && <ScheduleRow key={`${accountVersion}:${report.url}`} apiBase={apiBase} url={report.url} />}
      </>
    ) : null;

  /**
   * Every section of the report, by name. One source for both readings:
   * the page (behind the form) renders them in PAGE_ORDER, and the
   * conversation renders whichever the person or the assistant asks for,
   * as a block in the thread.
   */
  function renderSection(key: SectionKey): ReactNode {
    if (key === "audit") {
      return audit ? (
        <>
          <PrintButton label="Save the audit as PDF" />
          <SiteAuditView audit={audit} />
        </>
      ) : null;
    }
    if (key === "settings") return settingsNode;
    if (!report) return null;

    switch (key) {
      case "stop":
        /* The stop-press. When the scan proves a screen reader user cannot
           get past the cookie banner, that fact outranks the score —
           nothing else is reachable for them. role=alert announces it once,
           on render. */
        return report.findings.some((f) => f.ruleId === "consent-blocks-reader") ? (
          <div className="a11y-blockflag" role="alert">
            <p className="a11y-blockflag-title">
              {t("Start here: a screen reader cannot get past your cookie banner")}
            </p>
            <p className="a11y-blockflag-body">
              {t(
                "The banner hides the page from screen readers and never takes focus. Until that is fixed, everything below this line is what a screen reader user never reaches."
              )}
            </p>
            <button
              type="button"
              className="a11y-blockflag-jump"
              onClick={() =>
                focusFindings(professional && !isDocument ? "a11y-pro-findings" : "a11y-accessibility-heading")
              }
            >
              {t("See the finding")}
            </button>
          </div>
        ) : null;

      case "score":
        return (
          <>
            {isDocument ? (
              <DocumentSummary report={report} />
            ) : professional ? (
              <ProSummary
                report={report}
                issueCount={proIssueGroups}
                cleanCount={proCleanCount}
                view={proView}
                onViewChange={setProView}
                onSeeFindings={() => focusFindings("a11y-pro-findings")}
              />
            ) : (
              <>
                <ReportActions report={report} apiBase={apiBase} />
                <ScoreGauge
                  score={report.score}
                  seed={report.scannedAt}
                  findings={findingsByCategory.accessibility}
                  url={report.url}
                  allFindings={report.findings}
                  total={report.summary.total}
                  tookSeconds={tookSeconds}
                />
              </>
            )}
            {/* Only when the AI review was wanted but did not happen;
                "disabled_by_request" is the visitor's own choice. */}
            {report.meta.aiReviewStatus !== "completed" && report.meta.aiReviewStatus !== "disabled_by_request" && (
              <Notification
                kind="info"
                title="This check ran without the AI review"
                subtitle={
                  (report.meta.aiReviewStatus === "skipped_no_key" ? "Not set up yet." : "Temporarily unavailable.") +
                  " These findings come from automated checks only."
                }
              />
            )}
            {/* The score only counts checks that ran, so a scan where some
                fell over can look better than a complete one. Both audiences. */}
            {report.meta.incompleteChecks && report.meta.incompleteChecks.length > 0 && (
              <Notification
                kind="warning"
                title={`Some checks didn't finish this time: ${report.meta.incompleteChecks.join(", ")}.`}
                subtitle="The score above only counts what ran, so it may look better than it should. A second run usually completes them."
              />
            )}
          </>
        );

      case "protable":
        /* The professional reading: filter by who fixes it, the
           issues/no-issues switch, and the findings table. */
        return professional && !isDocument ? (
          <>
            <div className="a11y-mode a11y-filter" role="group" aria-label="Show findings by fix type">
              {(
                [
                  ["all", "All"],
                  ["design", "Design"],
                  ["code", "Code"],
                  ["content", "Content"],
                ] as const
              ).map(([fkey, label]) => (
                <button
                  key={fkey}
                  type="button"
                  className={`a11y-mode-btn a11y-filter-btn${fixFilter === fkey ? " a11y-mode-btn-active" : ""}`}
                  aria-pressed={fixFilter === fkey}
                  onClick={() => setFixFilter(fkey)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Tabs
              panelOwns="a11y-pro-findings"
              items={[
                {
                  id: "issues",
                  label: `Issues (${proIssueGroups})`,
                  panel: `${proIssueGroups} finding${proIssueGroups === 1 ? "" : "s"}`,
                },
                {
                  id: "clean",
                  label: `No issues found (${proCleanCount})`,
                  panel: `${proCleanCount} criteria with nothing found`,
                },
              ]}
              defaultId={proView}
              onChange={(id: string) => setProView(id as ProView)}
            />
            <ProfessionalTable
              findings={[
                ...findingsByCategory.darkPattern,
                ...findingsByCategory.accessibility,
                ...findingsByCategory.designClarity,
              ]}
              conformance={report.conformance}
              view={proView}
            />
          </>
        ) : null;

      case "history":
        return <ScanHistory current={toHistoryEntry(report)} previous={history} />;

      case "findings":
        /* In professional mode these cards are print-only: the screen shows
           the table, but a printed report has to stand alone. */
        return (
          <div className={professional && !isDocument ? "a11y-print-cards" : undefined}>
            {!isDocument && (
              <ReportSection
                title="What costs you trust"
                eyebrow="Dark pattern findings"
                description="Places your site nudges people rather than leaves the choice to them. These don't move the score. They move how much people trust you."
                variant={findingsByCategory.darkPattern.length > 0 ? "redflag" : "default"}
                findings={findingsByCategory.darkPattern}
                id="a11y-trust-heading"
              />
            )}
            <section className="a11y-section" aria-labelledby="a11y-accessibility-heading">
              <h2
                className="a11y-section-title"
                id="a11y-accessibility-heading"
                tabIndex={-1}
                data-nav-label={t("What people can't use")}
              >
                {t("What people can't use")}{" "}
                <span className="a11y-section-count">({findingsByCategory.accessibility.length})</span>
              </h2>
              <p className="a11y-section-desc">
                {isDocument
                  ? "What a screen reader cannot read aloud in this document, grouped by the four questions the standard asks. More at "
                  : "Grouped by the standard's four questions: can people see it, use it, understand it, and will it still work. More at "}
                <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
                  w3.org/WAI
                </a>
                .
              </p>
              <PrincipleGroup findings={findingsByCategory.accessibility} />
            </section>
          </div>
        );

      case "checklist":
        return (
          <>
            {report.conformance && (
              <ConformanceView conformance={report.conformance} showBfsgNote={!professional} verdicts={report.verdicts} />
            )}
            {/* Only for a saved scan: a verdict has to belong to somebody. */}
            {report.savedAs && signedIn && (
              <ManualChecks
                key={accountVersion}
                apiBase={apiBase}
                pageUrl={report.url}
                onVerdict={(v: RecordedVerdict) =>
                  setReport((r) =>
                    r ? { ...r, verdicts: [...(r.verdicts ?? []).filter((x) => x.criterion !== v.criterion), v] } : r
                  )
                }
              />
            )}
          </>
        );

      case "wcag22":
        return report.wcag22 ? <Wcag22Readiness readiness={report.wcag22} /> : null;

      case "team":
        return report.undecidedChecks && report.undecidedChecks.length > 0 ? (
          <div className={professional && !isDocument ? "a11y-print-cards" : undefined}>
            <UndecidedChecks rows={report.undecidedChecks} />
          </div>
        ) : null;

      case "notes":
        return !isDocument ? (
          <div className={professional && !isDocument ? "a11y-print-cards" : undefined}>
            <DesignNotesPanel findings={findingsByCategory.designClarity} />
          </div>
        ) : null;

      case "screenreader":
        return report.screenReaderScript ? <ScreenReaderPreview script={report.screenReaderScript} /> : null;

      case "statement":
        return !isDocument ? <AccessibilityStatement report={report} /> : null;

      case "vpat":
        return !isDocument ? <AcrDraft report={report} /> : null;

      case "simulator":
        /* Last in the page on purpose: an empathy exercise, worth a look
           after everything that matters. */
        return report.pagePreview ? (
          <VisionSimulator
            pagePreview={report.pagePreviewBehindConsent ?? report.pagePreview}
            url={report.url}
            behindConsent={!!report.pagePreviewBehindConsent}
          />
        ) : null;

      case "cta":
        /* One call to action, configured by the embedder. Business only. */
        return !professional && cta?.text && cta?.href ? (
          <section className="a11y-section a11y-cta">
            <a className="a11y-cta-link" href={cta.href} target="_blank" rel="noopener noreferrer">
              {cta.text}
            </a>
          </section>
        ) : null;

      default:
        return null;
    }
  }

  // What the conversation can offer for this result. A section that would
  // render nothing is not offered — a button that shows an empty block is
  // a promise the report cannot keep.
  const availableSections: SectionKey[] = (() => {
    if (audit) return ["audit", "settings"];
    if (!report) return [];
    const out: SectionKey[] = ["score", "findings"];
    if (report.conformance) out.push("checklist");
    if (report.wcag22) out.push("wcag22");
    if (report.undecidedChecks?.length) out.push("team");
    if (!isDocument && findingsByCategory.designClarity.length) out.push("notes");
    // A walk that came back empty renders nothing; it is not offered.
    if (report.screenReaderScript?.lines.length) out.push("screenreader");
    if (!isDocument) out.push("statement");
    if (!isDocument && report.conformance) out.push("vpat");
    if (report.pagePreview) out.push("simulator");
    if (history.length) out.push("history");
    out.push("settings");
    return out;
  })();

  // The scan's progress — bar, narration, elapsed time. One node, shown
  // inside the running scan turn of the chat or under the form's address.
  const progressNode = (
          loading && (
            <>
              {/* The system's own scanning UX: a determinate bar driven by
                  elapsed time against an honest expectation (a page scan
                  usually lands inside forty seconds; AI adds about thirty;
                  audits scale with pages), held at 95% until the real result
                  arrives — the words below stay the live region, the bar is
                  the picture. Rendered by UrlForm directly under the search
                  bar rather than below the whole form, so the radio groups
                  and options don't shift position while a scan runs. */}
              <ProgressBar
                label="In progress"
                value={
                  // Real steps beat estimated time: once the milestone
                  // stream is talking, the bar reports how far along the
                  // itinerary the scan actually is. Until (or unless) it
                  // talks, the elapsed-time estimate stands.
                  milestones.length > 0
                    ? Math.min(
                        95,
                        Math.round(
                          ((narrationIndex(milestones[milestones.length - 1]) + 1) /
                            NARRATION_STEPS.length) *
                            100
                        )
                      )
                    : Math.min(
                        95,
                        Math.round(
                          (elapsed /
                            ((mode === "site" ? 75 : 40) + (aiRequested ? 30 : 0))) *
                            100
                        )
                      )
                }
              />
              {/* The itinerary, narrated in type. Every line is something
                  the scanner is genuinely doing at that moment — the ids
                  arrive from the pipeline as it crosses each boundary. The
                  playfulness is scale and weight, not wording: done steps
                  fall back to small struck text, the current step is set
                  at display size, the ones ahead wait in small. Semantics
                  ride on the list itself (aria-current marks the step);
                  announcements come from the mounted status region below,
                  which speaks each milestone once. */}
              {milestones.length > 0 && (
                <ol className="a11y-scan-itinerary">
                  {NARRATION_STEPS.filter(
                    (s) => s.id !== "ai-review" || aiRequested
                  ).map((step, i) => {
                    const currentId = milestones[milestones.length - 1];
                    const currentIdx = narrationIndex(currentId);
                    const state =
                      step.id === currentId
                        ? "now"
                        : narrationIndex(step.id) < currentIdx
                          ? "done"
                          : "ahead";
                    return (
                      <li
                        key={step.id}
                        className={`a11y-scan-step a11y-scan-step-${state}`}
                        aria-current={state === "now" ? "step" : undefined}
                      >
                        <span className="a11y-scan-step-num" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </span>{" "}
                        {step.label()}
                      </li>
                    );
                  })}
                </ol>
              )}
              {/* The elapsed-time story, kept as the fallback: an older
                  backend or a proxy that refuses the stream leaves the
                  waiting screen exactly as it always was. Once the
                  narration is on screen the sentence would repeat what the
                  itinerary already says, so only the ticking seconds stay.

                  A counter inside a live region announces itself every
                  second, which would make this tool's own waiting screen
                  the most irritating thing a screen reader user met all
                  day — on a product whose entire subject is not doing
                  that. Sighted users get the reassurance of a moving
                  number; everyone else gets an update when there is
                  genuinely something new to say. */}
              <p className="a11y-loading">
                {milestones.length === 0 && (
                  <>
                    <span>{waitingMessage(mode, aiRequested, elapsed)}</span>{" "}
                  </>
                )}
                {!reducedMotion && (
                  <span className="a11y-elapsed" aria-hidden="true">
                    {elapsed}s
                  </span>
                )}
              </p>
            </>
          )
  );

  return (
    // A landmark, so everything the widget renders sits inside something a
    // screen-reader user can find and skip. Without it our content counted as
    // orphaned page content, which is a rule this product reports on others.
    //
    // <section aria-label> rather than <main>: the widget is a guest on
    // somebody else's page, and that page's own <main> is not ours to claim.
    <>
    <section
      className={`a11y-widget-inner${entry === "form" && sections.length > 0 ? " a11y-shell-with-nav" : ""}`}
      aria-label="Website accessibility check"
      /* The widget's language, declared where the widget starts. It is a
         guest on a page marked with the host's language; once the visitor
         switches to Deutsch every string inside is German, and without this
         a screen reader read it with English pronunciation rules — WCAG
         3.1.2, measured: no lang attribute anywhere in the tree. */
      lang={lang}
    >
    <AppShell
      onJump={jumpTo}
      /* The run's settings live in the rail once there is a run to describe.
         Report style flips in place; the other two re-run the scan, which is
         why they are buttons that name the cost rather than switches. */
      navSettings={entry === "form" ? settingsNode ?? undefined : undefined}
      /* The run controls live in the top bar now, for both audiences.
         "Export report" is professional-only: business mode already has
         Save as PDF in the report-actions panel, with the sentence that
         explains what the print dialog is, and two routes to the same
         export is the duplication this report keeps having to undo. */
      topActions={
        report || audit ? (
          <>
            {report && (
              <Button
                onClick={() =>
                  entry === "chat" && chatApi.current
                    ? chatApi.current.rerun(report.url, "page", report.meta.aiReviewStatus === "completed")
                    : handleScan(report.url, report.meta.aiReviewStatus === "completed", "page", 5)
                }
              >
                Run scan
              </Button>
            )}
            {professional && <PrintButton label="Export report" compact />}
            <Button variant="ghost" onClick={focusForm}>
              New scan
            </Button>
          </>
        ) : undefined
      }
      navMeta={
        report
          ? `${hostnameOf(report.url)} \u00b7 ${new Date(report.scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
          : audit
            ? `${hostnameOf(audit.pages[0]?.url ?? "")} \u00b7 ${audit.pagesScanned} pages`
            : undefined
      }
      sections={entry === "form" ? sections : []}
      activeId={activeSectionId}
      plans={plans}
      contentRef={shellContentRef}
    >
      {/* No standalone intro paragraph — the door metaphor said little the
          scanner's own subtitle couldn't say better, and the one useful
          claim it carried (what standard this follows, and why that
          matters) now sits directly on top of the scanner in UrlForm,
          where a reader deciding whether to run a scan actually looks. */}
      <div ref={formRef}>
      {/* Mounted in both readings: behind the form it renders nothing but
          keeps its thread and history. */}
      <ScanChat
          hidden={entry !== "chat"}
          apiRef={chatApi}
          apiBase={apiBase}
          loading={loading}
          milestones={milestones}
          elapsed={elapsed}
          reducedMotion={reducedMotion}
          report={report}
          audit={audit}
          renderSection={(key) => <ReportViewProvider value={reportView}>{renderSection(key)}</ReportViewProvider>}
          availableSections={availableSections}
          onScan={(url, scope, aiReview) => {
            const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
            return handleScan(full, aiReview, scope, 5);
          }}
          onUseForm={() => setEntry("form")}
          language={lang}
          onLanguageChange={changeLang}
        />
      {entry === "form" && (
      <>
      <UrlForm
        onSubmit={handleScan}
        loading={loading}
        audience={audience}
        onAudienceChange={(m) => {
          setAudience(m);
          setFixFilter("all");
        }}
        hasReport={!!report}
        scanError={error}
        scanBlocked={blocked}
        language={lang}
        onLanguageChange={changeLang}
        progress={progressNode}
      />
      <p className="a11y-chat-alt">
        <Button variant="ghost" onClick={() => setEntry("chat")}>
          {t("Back to the chat")}
        </Button>
      </p>
      </>
      )}
      </div>

      {/* The page reading's notices. The conversation shows its own, in
          the thread where the scan was asked for. */}
      {entry === "form" && blocked && <BlockedNotice message={blocked} />}

      {entry === "form" && error && (
        <p id="a11y-scan-error" className="a11y-error">
          {error}
        </p>
      )}

      {/* The announcement lives here, not on the visible paragraph above. A
          live region mounted together with its message is the classic way to
          say nothing: assistive technology watches existing regions for
          changes, and a region that arrives already full has not changed.
          This one is always in the DOM; the error text arriving is the
          change. */}
      <div className="a11y-sr-only" role="alert">
        {/* The page reading only: the conversation says what went wrong in
            its own reply, and both at once read the error twice. */}
        {entry === "form" ? error ?? "" : ""}
      </div>

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
          ? // The narration when it is talking — one announcement per
            // milestone, which is exactly the "changes only at milestones"
            // promise the elapsed-time story already kept.
            (milestones.length > 0
              ? narrationLabel(milestones[milestones.length - 1])
              : waitingMessage(mode, aiRequested, elapsed))
          : entry === "chat"
            ? "" // the conversation announces its own outcome, once
            : blocked
            ? blocked
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

      {/* The page reading of the report — only behind the form. In the
          conversation every one of these sections is a block in the thread,
          rendered by the same renderSection, so the two can never differ. */}
      {entry === "form" && audit && (
        <ReportViewProvider value={reportView}>{renderSection("audit")}</ReportViewProvider>
      )}
      {entry === "form" && report && (
        <ReportViewProvider value={reportView}>
          <div className="a11y-report">
            {PAGE_ORDER.map((key) => (
              <Fragment key={key}>{renderSection(key)}</Fragment>
            ))}
          </div>
        </ReportViewProvider>
      )}
    </AppShell>
    </section>
    {/* A portal target for anything that must escape .a11y-widget-inner —
        so far, just the delete-history confirmation dialog, which needs to
        sit outside the content it inerts while open (see ScanHistory). A
        sibling of the section above, still inside .a11y-widget-biz, so the
        reset and every scoped rule still reach it. */}
    <div className="a11y-dialog-root" />
    </>
  );
}
