import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";

/**
 * Triage: what the owner has decided about a finding.
 *
 * A scanner that cannot be told "this one is a false positive" or "this one
 * is ignored on purpose" reports the same thing every run until the owner
 * stops reading it. Four states, and one rule from the verdicts table: a
 * decision never overwrites, so who said a finding was a false positive,
 * and when, survives the day it turns out not to be.
 *
 * Keyed by the finding's fingerprint (rule and selector) per SITE, because
 * a decision about the cookie banner's contrast holds on every page that
 * banner appears on.
 *
 * What triage does NOT do: change the score. A finding marked ignored is
 * still a measured fault — the CLI leaves it out of its thresholds and
 * says how many it left out, and the report shows the mark. Hiding it from
 * the number would make the score a record of what the owner felt like
 * counting, and the score's whole value is that it is not.
 */
export type FindingState = "open" | "ignored" | "false-positive" | "fixed";
export const FINDING_STATES: FindingState[] = ["open", "ignored", "false-positive", "fixed"];

export interface FindingDecision {
  id: string;
  origin: string;
  fingerprint: string;
  state: FindingState;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function setFindingState(
  accountId: string,
  input: { origin: string; fingerprint: string; state: FindingState; note?: string; decidedBy: string }
): { decision?: FindingDecision; error?: string } {
  const db = getDb();
  if (!db) return { error: "storage not configured" };
  if (!FINDING_STATES.includes(input.state)) return { error: `"${input.state}" is not one of: ${FINDING_STATES.join(", ")}.` };
  if (!/^[0-9a-f]{16}$/.test(input.fingerprint)) return { error: "fingerprint must be the 16-character id a finding carries." };
  if (!input.decidedBy.trim()) return { error: "decidedBy is required: a decision nobody signed is not one." };
  const decision: FindingDecision = {
    id: randomUUID(),
    origin: originOf(input.origin),
    fingerprint: input.fingerprint,
    state: input.state,
    note: input.note?.trim() || null,
    decidedBy: input.decidedBy.trim(),
    decidedAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO finding_states (id, account_id, origin, fingerprint, state, note, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(decision.id, accountId, decision.origin, decision.fingerprint, decision.state, decision.note, decision.decidedBy, decision.decidedAt);
  return { decision };
}

/** The current state of every triaged finding on a site. */
export function findingStates(accountId: string, origin: string): Map<string, FindingDecision> {
  const db = getDb();
  const out = new Map<string, FindingDecision>();
  if (!db) return out;
  const rows = db
    .prepare(
      `SELECT id, origin, fingerprint, state, note, decided_by, decided_at
         FROM finding_states WHERE account_id = ? AND origin = ?
        ORDER BY fingerprint, decided_at DESC, rowid DESC`
    )
    .all(accountId, originOf(origin)) as Array<{
    id: string; origin: string; fingerprint: string; state: string; note: string | null; decided_by: string; decided_at: string;
  }>;
  for (const r of rows) {
    if (out.has(r.fingerprint)) continue;
    out.set(r.fingerprint, {
      id: r.id,
      origin: r.origin,
      fingerprint: r.fingerprint,
      state: r.state as FindingState,
      note: r.note,
      decidedBy: r.decided_by,
      decidedAt: r.decided_at,
    });
  }
  return out;
}
