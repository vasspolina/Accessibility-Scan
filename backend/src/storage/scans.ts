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

export function listScans(accountId: string, opts?: { origin?: string; limit?: number }): StoredScanSummary[] {
  const db = getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  const rows = (
    opts?.origin
      ? db
          .prepare(
            "SELECT id, url, origin, scanned_at, score, report_json FROM scans WHERE account_id = ? AND origin = ? ORDER BY scanned_at DESC, rowid DESC LIMIT ?"
          )
          .all(accountId, opts.origin, limit)
      : db
          .prepare(
            "SELECT id, url, origin, scanned_at, score, report_json FROM scans WHERE account_id = ? ORDER BY scanned_at DESC, rowid DESC LIMIT ?"
          )
          .all(accountId, limit)
  ) as Array<{ id: string; url: string; origin: string; scanned_at: string; score: number; report_json: string }>;

  return rows.map((r, i) => {
    let findingCount = 0;
    try {
      findingCount = (JSON.parse(r.report_json).findings ?? []).length;
    } catch {
      // A row that will not parse is still a row that happened; its count is
      // unknown rather than zero-with-confidence, and the summary says 0
      // only because there is nothing honest to put there.
    }
    // The previous scan OF THE SAME SITE, which is the only comparison that
    // means anything — rows are newest-first, so it is the next one along.
    const previous = rows.slice(i + 1).find((p) => p.origin === r.origin);
    return {
      id: r.id,
      url: r.url,
      origin: r.origin,
      scannedAt: r.scanned_at,
      score: r.score,
      findingCount,
      ...(previous ? { scoreChange: r.score - previous.score } : {}),
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
