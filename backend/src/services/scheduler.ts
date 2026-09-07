import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { storageStatus } from "../storage/db.js";
import { dueSchedules, markRun } from "../storage/schedules.js";
import { getScan, saveScan } from "../storage/scans.js";
import { scanUrlToReport } from "./scanPipeline.js";
import { sendReportEmail } from "./mail/sendReport.js";
import type { AccessibilityReport } from "../types/report.js";

/**
 * The scheduler: runs whatever is due, one at a time, and tells someone
 * when a site got worse.
 *
 * In-process rather than a queue, on purpose. The scale this serves is a
 * handful of schedules whose runs are minutes apart, on a service that
 * already holds a browser pool; a queue would add a second process and a
 * broker to keep in step with it, for a problem a sixty-second tick
 * solves. If two instances ever run against one database, the second
 * should have SCHEDULER_ENABLED=false — noted in .env.example.
 *
 * ONE scan at a time, and only when the pool has room. Scheduled work must
 * never take the browser a person is waiting on: a person sees the delay,
 * a schedule does not.
 *
 * "Worse" is measured, not felt: the score fell, or a finding appeared
 * whose fingerprint the previous saved scan did not have. A schedule that
 * emailed on every run would be unsubscribed from in a week.
 */
export interface RunOutcome {
  scheduleId: string;
  url: string;
  ok: boolean;
  score?: number;
  scoreChange?: number | null;
  newFindings?: number;
  notified?: boolean;
  error?: string;
}

// Injectable so the tick can be tested without a browser.
type Runner = (url: string) => Promise<AccessibilityReport>;
type Mailer = (to: string, report: AccessibilityReport, heading?: string) => Promise<{ ok: boolean }>;

let timer: NodeJS.Timeout | null = null;
let running = false;
let lastTickAt: string | null = null;
let lastOutcome: RunOutcome | null = null;

export function schedulerStatus() {
  return {
    enabled: env.SCHEDULER_ENABLED && storageStatus().configured,
    running: timer !== null,
    tickSeconds: env.SCHEDULER_TICK_SECONDS,
    lastTickAt,
    lastOutcome,
    mail: Boolean(env.MAIL_API_KEY && env.MAIL_FROM),
  };
}

function newFingerprints(previous: AccessibilityReport | null, current: AccessibilityReport): number {
  if (!previous) return 0;
  const known = new Set(previous.findings.map((f) => f.fingerprint).filter(Boolean));
  return current.findings.filter((f) => f.category === "accessibility" && f.fingerprint && !known.has(f.fingerprint)).length;
}

/** One pass over what is due. Exported for the tests; the timer calls it. */
export async function tick(
  runner: Runner = (url) => scanUrlToReport(url, false, undefined, true, undefined, false),
  mailer: Mailer = sendReportEmail,
  now = new Date()
): Promise<RunOutcome | null> {
  if (running) return null;
  running = true;
  lastTickAt = now.toISOString();
  try {
    const [due] = dueSchedules(1, now);
    if (!due) return null;
    const previous = due.lastScanId ? getScan(due.accountId, due.lastScanId) : null;
    let outcome: RunOutcome;
    try {
      const report = await runner(due.url);
      const scanId = saveScan(due.accountId, report) ?? "";
      const scoreChange = due.lastScore === null ? null : report.score - due.lastScore;
      const fresh = newFingerprints(previous, report);
      const worse = (scoreChange !== null && scoreChange < 0) || fresh > 0;
      let notified = false;
      if (worse && due.notifyEmail) {
        const what = [
          scoreChange !== null && scoreChange < 0 ? `score ${due.lastScore} → ${report.score}` : null,
          fresh > 0 ? `${fresh} new finding${fresh === 1 ? "" : "s"}` : null,
        ].filter(Boolean).join(", ");
        notified = (await mailer(due.notifyEmail, report, `Scheduled scan: ${report.url} got worse. ${what}`)).ok;
      }
      markRun(due.id, { scanId, score: report.score }, due.everyHours, now);
      outcome = { scheduleId: due.id, url: due.url, ok: true, score: report.score, scoreChange, newFindings: fresh, notified };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      markRun(due.id, { error: message }, due.everyHours, now);
      outcome = { scheduleId: due.id, url: due.url, ok: false, error: message };
    }
    lastOutcome = outcome;
    logger.info({ outcome }, "scheduled scan");
    return outcome;
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (timer || !env.SCHEDULER_ENABLED || !storageStatus().configured) return;
  timer = setInterval(() => {
    void tick().catch((err) => logger.error({ err }, "scheduler tick failed"));
  }, env.SCHEDULER_TICK_SECONDS * 1000);
  timer.unref();
  logger.info({ tickSeconds: env.SCHEDULER_TICK_SECONDS }, "scheduler started");
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
