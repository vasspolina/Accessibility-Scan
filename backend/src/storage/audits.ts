import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import type { SiteAudit } from "../services/crawl/aggregateAudit.js";

/**
 * Saved site audits. The multi-page counterpart of scans, and the better
 * source for a SITE's open questions: a page's conformance rows describe
 * that page, an audit's describe the site.
 */
export interface StoredAuditSummary {
  id: string;
  entryUrl: string;
  origin: string;
  scannedAt: string;
  averageScore: number;
  pagesScanned: number;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function saveAudit(accountId: string, audit: SiteAudit): string | null {
  const db = getDb();
  if (!db) return null;
  const id = randomUUID();
  db.prepare(
    "INSERT INTO audits (id, account_id, entry_url, origin, scanned_at, average_score, audit_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, accountId, audit.entryUrl, originOf(audit.entryUrl), audit.scannedAt, Math.round(audit.averageScore), JSON.stringify(audit));
  return id;
}

export function listAudits(accountId: string, opts?: { origin?: string; limit?: number }): StoredAuditSummary[] {
  const db = getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  const origin = opts?.origin ? originOf(opts.origin) : undefined;
  const rows = (
    origin
      ? db.prepare("SELECT id, entry_url, origin, scanned_at, average_score, audit_json FROM audits WHERE account_id = ? AND origin = ? ORDER BY scanned_at DESC, rowid DESC LIMIT ?").all(accountId, origin, limit)
      : db.prepare("SELECT id, entry_url, origin, scanned_at, average_score, audit_json FROM audits WHERE account_id = ? ORDER BY scanned_at DESC, rowid DESC LIMIT ?").all(accountId, limit)
  ) as Array<{ id: string; entry_url: string; origin: string; scanned_at: string; average_score: number; audit_json: string }>;
  return rows.map((r) => {
    let pagesScanned = 0;
    try {
      pagesScanned = (JSON.parse(r.audit_json) as SiteAudit).pagesScanned ?? 0;
    } catch {
      // Unparseable row: still listed, count unknown.
    }
    return { id: r.id, entryUrl: r.entry_url, origin: r.origin, scannedAt: r.scanned_at, averageScore: r.average_score, pagesScanned };
  });
}

export function getAudit(accountId: string, id: string): SiteAudit | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare("SELECT audit_json FROM audits WHERE id = ? AND account_id = ?").get(id, accountId) as { audit_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.audit_json) as SiteAudit;
  } catch {
    return null;
  }
}

export function deleteAudit(accountId: string, id: string): boolean {
  const db = getDb();
  if (!db) return false;
  return Number(db.prepare("DELETE FROM audits WHERE id = ? AND account_id = ?").run(id, accountId).changes) > 0;
}
