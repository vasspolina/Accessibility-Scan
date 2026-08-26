import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import type { AccessibilityReport } from "../types/report.js";

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
  db.prepare(
    "INSERT INTO scans (id, account_id, url, origin, scanned_at, score, report_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, accountId, report.url, originOf(report.url), report.scannedAt, report.score, JSON.stringify(report));
  return id;
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
    try {
      findingCount = (JSON.parse(r.report_json).findings ?? []).length;
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
