import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { barrierRecord, participantId, type PilotDraft, type SubmitBody } from "../services/pilot/pilot.js";

/**
 * Pilot barrier reports (services/pilot/pilot.ts). Never pruned and never
 * overwritten: a report is what one person said happened, and a pilot's
 * whole value is that record.
 */

export interface PilotReport {
  id: string;
  participant: string;
  createdAt: string;
  pageUrl: string | null;
  assistiveTech: string;
  task: string;
  barrier: string;
  impact: string;
  draft: PilotDraft | null;
  draftModel: string | null;
  confirmed: boolean;
  /** The latest mark on whether the scanner caught this barrier, or null
   *  while nobody has checked (pilot_checks). */
  check: PilotCheck | null;
}

/** Whether the scanner caught a report's barrier. "caught": a scan of the
 *  page has a finding for it; "missed": it has none; "unclear": the page
 *  could not be scanned or the report says too little to tell. */
export const CHECK_RESULTS = ["caught", "missed", "unclear"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

export interface PilotCheck {
  id: string;
  result: CheckResult;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
}

/** Returns the new id, or null when storage is not set up. */
export function savePilotReport(body: SubmitBody, model: string | undefined): string | null {
  const db = getDb();
  if (!db) return null;
  const id = randomUUID();
  const at = body.assistiveTechDetail ? `${body.assistiveTech}: ${body.assistiveTechDetail}` : body.assistiveTech;
  db.prepare(
    `INSERT INTO pilot_reports
       (id, participant, created_at, page_url, assistive_tech, task, barrier, impact, draft_json, draft_model, confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    participantId(body.participant),
    new Date().toISOString(),
    body.pageUrl ?? null,
    at,
    body.task,
    // Their side of the conversation: what happened, then each question
    // with their answer (barrierRecord).
    barrierRecord(body) || "(not described: drafted from a scan of the page)",
    // NOT NULL in the table; the form stopped asking (19 Nov 2026), and the
    // model's estimate stays in draft_json, never in this column.
    body.impact ?? "unrated",
    body.draft ? JSON.stringify(body.draft) : null,
    body.draft ? (model ?? null) : null,
    body.draft && body.confirmed ? 1 : 0
  );
  return id;
}

interface Row {
  id: string;
  participant: string;
  created_at: string;
  page_url: string | null;
  assistive_tech: string;
  task: string;
  barrier: string;
  impact: string;
  draft_json: string | null;
  draft_model: string | null;
  confirmed: number;
}

export function listPilotReports(limit = 500): PilotReport[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare("SELECT * FROM pilot_reports ORDER BY created_at DESC, rowid DESC LIMIT ?")
    .all(limit) as unknown as Row[];
  const checks = latestChecks();
  return rows.map((r) => ({
    id: r.id,
    participant: r.participant,
    createdAt: r.created_at,
    pageUrl: r.page_url,
    assistiveTech: r.assistive_tech,
    task: r.task,
    barrier: r.barrier,
    impact: r.impact,
    draft: r.draft_json ? (JSON.parse(r.draft_json) as PilotDraft) : null,
    draftModel: r.draft_model,
    confirmed: r.confirmed === 1,
    check: checks.get(r.id) ?? null,
  }));
}

/**
 * Marks whether the scanner caught a report's barrier. A new row every
 * time, never an update: the latest is the mark, the rest its history.
 */
export function savePilotCheck(input: {
  reportId: string;
  result: CheckResult;
  note?: string;
  decidedBy: string;
}): { check?: PilotCheck; error?: "not_configured" | "no_such_report" } {
  const db = getDb();
  if (!db) return { error: "not_configured" };
  if (!db.prepare("SELECT 1 FROM pilot_reports WHERE id = ?").get(input.reportId)) return { error: "no_such_report" };
  const check: PilotCheck = {
    id: randomUUID(),
    result: input.result,
    note: input.note?.trim() || null,
    decidedBy: input.decidedBy.trim(),
    decidedAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO pilot_checks (id, report_id, result, note, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(check.id, input.reportId, check.result, check.note, check.decidedBy, check.decidedAt);
  return { check };
}

/** Every mark on one report, newest first. */
export function pilotCheckHistory(reportId: string): PilotCheck[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      `SELECT id, result, note, decided_by, decided_at FROM pilot_checks
        WHERE report_id = ? ORDER BY decided_at DESC, rowid DESC`
    )
    .all(reportId) as unknown as CheckRow[];
  return rows.map(toCheck);
}

interface CheckRow { id: string; report_id?: string; result: string; note: string | null; decided_by: string; decided_at: string }

function toCheck(r: CheckRow): PilotCheck {
  return { id: r.id, result: r.result as CheckResult, note: r.note, decidedBy: r.decided_by, decidedAt: r.decided_at };
}

/** The current mark per report: the newest row for each. */
function latestChecks(): Map<string, PilotCheck> {
  const out = new Map<string, PilotCheck>();
  const db = getDb();
  if (!db) return out;
  const rows = db
    .prepare(
      `SELECT id, report_id, result, note, decided_by, decided_at FROM pilot_checks
        ORDER BY decided_at DESC, rowid DESC`
    )
    .all() as unknown as CheckRow[];
  for (const r of rows) if (r.report_id && !out.has(r.report_id)) out.set(r.report_id, toCheck(r));
  return out;
}

/** The pilot's own numbers, counted from the table rather than kept as a tally. */
export function pilotTotals(): { reports: number; participants: number; drafted: number; confirmed: number } {
  const db = getDb();
  if (!db) return { reports: 0, participants: 0, drafted: 0, confirmed: 0 };
  return db
    .prepare(
      `SELECT COUNT(*) AS reports,
              COUNT(DISTINCT participant) AS participants,
              COUNT(draft_json) AS drafted,
              COALESCE(SUM(confirmed), 0) AS confirmed
         FROM pilot_reports`
    )
    .get() as unknown as { reports: number; participants: number; drafted: number; confirmed: number };
}
