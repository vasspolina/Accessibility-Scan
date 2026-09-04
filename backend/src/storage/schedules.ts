import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";

/**
 * Scheduled scans — the standing instruction behind "tell me when it gets
 * worse". A row says what to scan and how often; the scheduler service
 * runs what is due and writes back what happened, including the error when
 * it did not, so a schedule that has been failing for a month is visible
 * as one rather than looking merely quiet.
 */
export interface Schedule {
  id: string;
  url: string;
  everyHours: number;
  notifyEmail: string | null;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastScore: number | null;
  lastScanId: string | null;
  lastError: string | null;
  createdAt: string;
}

export const MIN_EVERY_HOURS = 1;
export const MAX_EVERY_HOURS = 24 * 90;

type Row = {
  id: string; account_id?: string; url: string; every_hours: number; notify_email: string | null; enabled: number;
  next_run_at: string; last_run_at: string | null; last_score: number | null; last_scan_id: string | null; last_error: string | null; created_at: string;
};

const toSchedule = (r: Row): Schedule => ({
  id: r.id,
  url: r.url,
  everyHours: r.every_hours,
  notifyEmail: r.notify_email,
  enabled: r.enabled === 1,
  nextRunAt: r.next_run_at,
  lastRunAt: r.last_run_at,
  lastScore: r.last_score,
  lastScanId: r.last_scan_id,
  lastError: r.last_error,
  createdAt: r.created_at,
});

const COLS = "id, account_id, url, every_hours, notify_email, enabled, next_run_at, last_run_at, last_score, last_scan_id, last_error, created_at";

export function createSchedule(
  accountId: string,
  input: { url: string; everyHours: number; notifyEmail?: string }
): { schedule?: Schedule; error?: string } {
  const db = getDb();
  if (!db) return { error: "storage not configured" };
  const hours = Math.round(input.everyHours);
  if (!Number.isFinite(hours) || hours < MIN_EVERY_HOURS || hours > MAX_EVERY_HOURS) {
    return { error: `everyHours must be between ${MIN_EVERY_HOURS} and ${MAX_EVERY_HOURS}.` };
  }
  const now = new Date();
  const schedule: Schedule = {
    id: randomUUID(),
    url: input.url,
    everyHours: hours,
    notifyEmail: input.notifyEmail?.trim() || null,
    enabled: true,
    // First run is due now: a person who sets up a schedule wants to see
    // it work, not wait a day to find out the URL was wrong.
    nextRunAt: now.toISOString(),
    lastRunAt: null,
    lastScore: null,
    lastScanId: null,
    lastError: null,
    createdAt: now.toISOString(),
  };
  db.prepare(
    `INSERT INTO schedules (${COLS}) VALUES (?, ?, ?, ?, ?, 1, ?, NULL, NULL, NULL, NULL, ?)`
  ).run(schedule.id, accountId, schedule.url, schedule.everyHours, schedule.notifyEmail, schedule.nextRunAt, schedule.createdAt);
  return { schedule };
}

export function listSchedules(accountId: string): Schedule[] {
  const db = getDb();
  if (!db) return [];
  return (db.prepare(`SELECT ${COLS} FROM schedules WHERE account_id = ? ORDER BY created_at DESC`).all(accountId) as Row[]).map(toSchedule);
}

export function getSchedule(accountId: string, id: string): Schedule | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`SELECT ${COLS} FROM schedules WHERE id = ? AND account_id = ?`).get(id, accountId) as Row | undefined;
  return row ? toSchedule(row) : null;
}

export function setScheduleEnabled(accountId: string, id: string, enabled: boolean): boolean {
  const db = getDb();
  if (!db) return false;
  return Number(db.prepare("UPDATE schedules SET enabled = ? WHERE id = ? AND account_id = ?").run(enabled ? 1 : 0, id, accountId).changes) > 0;
}

/** Makes a schedule due now, for "run it again". */
export function requestRun(accountId: string, id: string): boolean {
  const db = getDb();
  if (!db) return false;
  return Number(db.prepare("UPDATE schedules SET next_run_at = ? WHERE id = ? AND account_id = ?").run(new Date().toISOString(), id, accountId).changes) > 0;
}

export function deleteSchedule(accountId: string, id: string): boolean {
  const db = getDb();
  if (!db) return false;
  return Number(db.prepare("DELETE FROM schedules WHERE id = ? AND account_id = ?").run(id, accountId).changes) > 0;
}

/** What the scheduler should run now. Account id travels with each row
 *  because the run saves under it. */
export function dueSchedules(limit: number, now = new Date()): Array<Schedule & { accountId: string }> {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT ${COLS} FROM schedules WHERE enabled = 1 AND next_run_at <= ? ORDER BY next_run_at ASC LIMIT ?`)
    .all(now.toISOString(), limit) as Row[];
  return rows.map((r) => ({ ...toSchedule(r), accountId: r.account_id! }));
}

/**
 * Records a run — and advances next_run_at either way. A failing schedule
 * that stayed due would be retried every tick, which is how a dead site
 * turns into a browser pool doing nothing else.
 */
export function markRun(
  id: string,
  result: { scanId: string; score: number } | { error: string },
  everyHours: number,
  now = new Date()
): void {
  const db = getDb();
  if (!db) return;
  const next = new Date(now.getTime() + everyHours * 3_600_000).toISOString();
  if ("error" in result) {
    db.prepare("UPDATE schedules SET last_run_at = ?, next_run_at = ?, last_error = ? WHERE id = ?").run(now.toISOString(), next, result.error, id);
  } else {
    db.prepare(
      "UPDATE schedules SET last_run_at = ?, next_run_at = ?, last_score = ?, last_scan_id = ?, last_error = NULL WHERE id = ?"
    ).run(now.toISOString(), next, result.score, result.scanId, id);
  }
}
