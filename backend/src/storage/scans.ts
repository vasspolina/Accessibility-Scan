import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import type { AccessibilityReport } from "../types/report.js";
import { env } from "../config/env.js";

/**
 * Saved scans, and the regression view they make possible.
 *
 * A report used to be a value returned once and forgotten. Keeping them is
 * what turns "your score is 62" into "your score was 74 last month", which
 * is the question an owner actually asks after the first scan.
 */

export interface StoredScanSummary {
  id: string;
  url: string;
  origin: string;
  scannedAt: string;
  score: number;
  findingCount: number;
  /** Present from the second scan of a site onward. */
  scoreChange?: number;
  /** Enough of the report for the widget's "since last time" comparison —
   *  which rules were present, and how many of each severity — without
   *  shipping the report, a third of which is screenshots. */
  ruleIds: string[];
  severity: { critical: number; serious: number; moderate: number; minor: number };
  conformanceFailed: number;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function saveScan(accountId: string, report: AccessibilityReport): string | null {
  const db = getDb();
  if (!db) return null;
  const id = randomUUID();
  const origin = originOf(report.url);
  db.prepare(
    "INSERT INTO scans (id, account_id, url, origin, scanned_at, score, report_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, accountId, report.url, origin, report.scannedAt, report.score, JSON.stringify(report));
  prune(accountId, origin);
  return id;
}

/**
 * Keeps a site's history bounded: older than SCAN_RETENTION_DAYS, or beyond
 * the newest SCANS_PER_SITE_MAX, goes. Runs on every save so the ceiling is
 * always in force, and only for the site just saved so the cost is one
 * small DELETE. Verdicts are untouched — they are the record, and a
 * decision about a site does not expire with the scan that prompted it.
 */
function prune(accountId: string, origin: string): void {
  const db = getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - env.SCAN_RETENTION_DAYS * 86_400_000).toISOString();
  db.prepare("DELETE FROM scans WHERE account_id = ? AND origin = ? AND scanned_at < ?").run(accountId, origin, cutoff);
  db.prepare(
    `DELETE FROM scans WHERE account_id = ? AND origin = ? AND id NOT IN (
       SELECT id FROM scans WHERE account_id = ? AND origin = ?
        ORDER BY scanned_at DESC, rowid DESC LIMIT ?)`
  ).run(accountId, origin, accountId, origin, env.SCANS_PER_SITE_MAX);
}

/** Everything an account has, for export — the GDPR Article 15 answer. */
export function allScans(accountId: string): AccessibilityReport[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare("SELECT report_json FROM scans WHERE account_id = ? ORDER BY scanned_at DESC, rowid DESC")
    .all(accountId) as Array<{ report_json: string }>;
  const out: AccessibilityReport[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.report_json));
    } catch {
      // A row that will not parse is dropped from the export rather than
      // failing the whole of it.
    }
  }
  return out;
}

/**
 * The list, newest first, each row carrying the change since the previous
 * scan of the same site.
 *
 * The comparison is computed in SQL, over the whole of that site's history,
 * and not by looking at the neighbouring row in the returned window. It was
 * done the second way and it was wrong: the oldest row in any window
 * reported NO previous scan, because there was none IN THE WINDOW. With the
 * default limit that meant the fiftieth scan silently read as a site's
 * first, which is the reading an absent scoreChange is supposed to carry.
 * Measured with five scans and limit 3.
 */
export function listScans(accountId: string, opts?: { origin?: string; limit?: number }): StoredScanSummary[] {
  const db = getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  // Normalised the same way saveScan normalised it on the way in. A caller
  // holding the URL they scanned — the natural thing to hold — was passing
  // "https://example.com/pricing" and being told the site had no scans at
  // all, because the column stores the origin.
  const origin = opts?.origin ? originOf(opts.origin) : undefined;
  const select = `SELECT id, url, origin, scanned_at, score, report_json, prev_score FROM (
      SELECT id, url, origin, scanned_at, score, report_json, rowid,
             LAG(score) OVER (PARTITION BY origin ORDER BY scanned_at, rowid) AS prev_score
        FROM scans WHERE account_id = ?%s
    ) ORDER BY scanned_at DESC, rowid DESC LIMIT ?`;
  const rows = (
    origin
      ? db.prepare(select.replace("%s", " AND origin = ?")).all(accountId, origin, limit)
      : db.prepare(select.replace("%s", "")).all(accountId, limit)
  ) as Array<{
    id: string;
    url: string;
    origin: string;
    scanned_at: string;
    score: number;
    report_json: string;
    prev_score: number | null;
  }>;

  return rows.map((r) => {
    let findingCount = 0;
    let ruleIds: string[] = [];
    let severity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    let conformanceFailed = 0;
    try {
      const report = JSON.parse(r.report_json) as AccessibilityReport;
      findingCount = (report.findings ?? []).length;
      const acc = (report.findings ?? []).filter((f) => f.category === "accessibility");
      ruleIds = [...new Set(acc.map((f) => f.ruleId).filter((x): x is string => Boolean(x)))].sort();
      severity = {
        critical: report.summary?.critical ?? 0,
        serious: report.summary?.serious ?? 0,
        moderate: report.summary?.moderate ?? 0,
        minor: report.summary?.minor ?? 0,
      };
      conformanceFailed = report.conformance?.failed ?? 0;
    } catch {
      // A row that will not parse is still a row that happened; its count is
      // unknown rather than zero-with-confidence, and the summary says 0
      // only because there is nothing honest to put there.
    }
    return {
      id: r.id,
      url: r.url,
      origin: r.origin,
      scannedAt: r.scanned_at,
      score: r.score,
      findingCount,
      ruleIds,
      severity,
      conformanceFailed,
      // Absent only when this really is the site's first scan.
      ...(r.prev_score === null ? {} : { scoreChange: r.score - r.prev_score }),
    };
  });
}

export function getScan(accountId: string, id: string): AccessibilityReport | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare("SELECT report_json FROM scans WHERE id = ? AND account_id = ?").get(id, accountId) as
    | { report_json: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.report_json) as AccessibilityReport;
  } catch {
    return null;
  }
}

/** Deleting is the other half of storing. An owner who asks for their scans
 *  to go must be able to have that, and a test needs it too. */
export function deleteScan(accountId: string, id: string): boolean {
  const db = getDb();
  if (!db) return false;
  const res = db.prepare("DELETE FROM scans WHERE id = ? AND account_id = ?").run(id, accountId);
  return Number(res.changes) > 0;
}
