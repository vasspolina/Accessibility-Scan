import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { participantId, type PilotDraft, type SubmitBody } from "../services/pilot/pilot.js";

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
    participantId(body.code),
    new Date().toISOString(),
    body.pageUrl ?? null,
    at,
    body.task,
    body.barrier,
    body.impact,
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
  }));
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
