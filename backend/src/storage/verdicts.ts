import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { WCAG_21_AA_CRITERIA, normalizeCriterionId } from "../services/conformance/wcagCriteria.js";

/**
 * Guided manual testing: the human half of the report, recorded.
 *
 * The audit called this the largest differentiated thing this product could
 * build, and its reasoning is the reason this file is small. The hard half
 * was already done: the scan names precisely what it cannot decide, in a
 * reader's language, criterion by criterion. What it offered was a list of
 * open questions with no way to close any of them — nothing recorded an
 * answer, attached evidence, or said who decided.
 *
 * The consequence compounded: buildAcrDraft deliberately leaves the
 * Conformance Level blank for every non-failing row, because a scan can
 * never justify "Supports". Correct — and it meant the ACR could never be
 * completed inside the product, however much human work was done. A
 * recorded human verdict is the missing piece, and this is it.
 *
 * Two rules keep it honest:
 *
 *   A verdict belongs to a SITE, not a scan. "Do your videos have captions"
 *   is answered about the site and holds for every later scan until someone
 *   changes it — otherwise every re-scan would ask the same questions again,
 *   which is exactly the thing that makes manual testing feel pointless.
 *
 *   Ordering falls back to insertion order, not just to the timestamp. Two
 *   verdicts recorded in the same millisecond have identical decided_at
 *   strings, and without the rowid tie-break the SUPERSEDED one was returned
 *   as current — a person correcting a decision immediately would have seen
 *   the correction ignored. Measured, not theorised: a test recording two in
 *   a row hit it every time.
 *
 *   A verdict never overwrites. Superseding writes a new row pointing at the
 *   old one, so "who said this site supports 1.2.2, and when" survives being
 *   changed later. An accessibility statement is a document people rely on;
 *   its history is part of it.
 */

/** The four terms an ACR permits, plus the one this product adds. */
export type VerdictStatus =
  | "supports"
  | "partially-supports"
  | "does-not-support"
  | "not-applicable"
  /** Looked at, could not decide yet. Distinct from never having looked. */
  | "unresolved";

export const VERDICT_STATUSES: VerdictStatus[] = [
  "supports",
  "partially-supports",
  "does-not-support",
  "not-applicable",
  "unresolved",
];

export interface Verdict {
  id: string;
  origin: string;
  criterion: string;
  status: VerdictStatus;
  note: string | null;
  evidence: string | null;
  decidedBy: string;
  decidedAt: string;
  supersedes: string | null;
  /** The page it was checked on, when the person said. */
  pageUrl: string | null;
  /** The undecided item (its check id) this answers, when it answers one. */
  answersCheck: string | null;
}

export interface VerdictInput {
  origin: string;
  criterion: string;
  status: VerdictStatus;
  note?: string;
  evidence?: string;
  decidedBy: string;
  pageUrl?: string;
  answersCheck?: string;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const KNOWN_CRITERIA = new Set(WCAG_21_AA_CRITERIA.map((c) => c.id));

/**
 * Records a decision. Returns the stored verdict, or an error string naming
 * what was wrong — a criterion nobody can name is a typo, and storing it
 * would put a verdict in the database that no report will ever read.
 */
export function recordVerdict(accountId: string, input: VerdictInput): { verdict?: Verdict; error?: string } {
  const db = getDb();
  if (!db) return { error: "storage not configured" };

  const criterion = normalizeCriterionId(input.criterion);
  if (!criterion || !KNOWN_CRITERIA.has(criterion)) {
    return { error: `"${input.criterion}" is not a WCAG 2.1 A or AA criterion this report covers.` };
  }
  if (!VERDICT_STATUSES.includes(input.status)) {
    return { error: `"${input.status}" is not one of: ${VERDICT_STATUSES.join(", ")}.` };
  }
  if (!input.decidedBy.trim()) {
    return { error: "decidedBy is required: a verdict nobody signed is not evidence." };
  }

  const origin = originOf(input.origin);
  const current = latestVerdict(accountId, origin, criterion);
  const verdict: Verdict = {
    id: randomUUID(),
    origin,
    criterion,
    status: input.status,
    note: input.note?.trim() || null,
    evidence: input.evidence?.trim() || null,
    decidedBy: input.decidedBy.trim(),
    decidedAt: new Date().toISOString(),
    supersedes: current?.id ?? null,
    pageUrl: input.pageUrl?.trim() || null,
    answersCheck: input.answersCheck?.trim() || null,
  };
  db.prepare(
    `INSERT INTO verdicts (id, account_id, origin, criterion, status, note, evidence, decided_by, decided_at, supersedes, page_url, answers_check)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    verdict.id,
    accountId,
    verdict.origin,
    verdict.criterion,
    verdict.status,
    verdict.note,
    verdict.evidence,
    verdict.decidedBy,
    verdict.decidedAt,
    verdict.supersedes,
    verdict.pageUrl,
    verdict.answersCheck
  );
  return { verdict };
}

function rowToVerdict(r: {
  id: string;
  origin: string;
  criterion: string;
  status: string;
  note: string | null;
  evidence: string | null;
  decided_by: string;
  decided_at: string;
  supersedes: string | null;
  page_url: string | null;
  answers_check: string | null;
}): Verdict {
  return {
    id: r.id,
    origin: r.origin,
    criterion: r.criterion,
    status: r.status as VerdictStatus,
    note: r.note,
    evidence: r.evidence,
    decidedBy: r.decided_by,
    decidedAt: r.decided_at,
    supersedes: r.supersedes,
    pageUrl: r.page_url,
    answersCheck: r.answers_check,
  };
}

export function latestVerdict(accountId: string, origin: string, criterion: string): Verdict | null {
  const db = getDb();
  if (!db) return null;
  const row = db
    .prepare(
      `SELECT id, origin, criterion, status, note, evidence, decided_by, decided_at, supersedes, page_url, answers_check
         FROM verdicts WHERE account_id = ? AND origin = ? AND criterion = ?
        ORDER BY decided_at DESC, rowid DESC LIMIT 1`
    )
    .get(accountId, originOf(origin), criterion) as Parameters<typeof rowToVerdict>[0] | undefined;
  return row ? rowToVerdict(row) : null;
}

/** The current verdict for every criterion this site has one for. */
export function verdictsForSite(accountId: string, origin: string): Verdict[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      `SELECT id, origin, criterion, status, note, evidence, decided_by, decided_at, supersedes, page_url, answers_check
         FROM verdicts WHERE account_id = ? AND origin = ?
        ORDER BY criterion, decided_at DESC, rowid DESC`
    )
    .all(accountId, originOf(origin)) as Array<Parameters<typeof rowToVerdict>[0]>;
  const latest = new Map<string, Verdict>();
  for (const r of rows) if (!latest.has(r.criterion)) latest.set(r.criterion, rowToVerdict(r));
  return [...latest.values()];
}

/** Every decision ever made about one criterion, newest first. The audit
 *  trail an accessibility statement's readers are entitled to. */
export function verdictHistory(accountId: string, origin: string, criterion: string): Verdict[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      `SELECT id, origin, criterion, status, note, evidence, decided_by, decided_at, supersedes, page_url, answers_check
         FROM verdicts WHERE account_id = ? AND origin = ? AND criterion = ?
        ORDER BY decided_at DESC, rowid DESC`
    )
    .all(accountId, originOf(origin), criterion) as Array<Parameters<typeof rowToVerdict>[0]>;
  return rows.map(rowToVerdict);
}

/** Every verdict ever recorded by an account, history included — the
 *  export, not the current view. */
export function allVerdicts(accountId: string): Verdict[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      `SELECT id, origin, criterion, status, note, evidence, decided_by, decided_at, supersedes, page_url, answers_check
         FROM verdicts WHERE account_id = ? ORDER BY origin, criterion, decided_at DESC, rowid DESC`
    )
    .all(accountId) as Array<Parameters<typeof rowToVerdict>[0]>;
  return rows.map(rowToVerdict);
}

export interface GuidedQuestion {
  criterion: string;
  name: string;
  level: "A" | "AA";
  /** The question in the reader's words — the scan's own plain text. */
  question: string;
  /** Why the scan cannot answer it, when it has something to say. */
  whyAsking: string;
  /** The verdict already on file, if a person has answered before. */
  answered: Verdict | null;
}

/**
 * The open questions for a site: every criterion the scan could not decide,
 * paired with any answer already on file.
 *
 * Built from a report's OWN conformance rows rather than from a fixed list,
 * so a criterion that a new probe learns to decide stops being asked the
 * moment that probe ships — the list of open questions shrinks as the
 * scanner improves, which is the behaviour that makes it trustworthy.
 */
export function guidedQuestions(
  accountId: string,
  origin: string,
  criteria: Array<{ id: string; name: string; level: "A" | "AA"; status: string; plain: string; notMeasured?: string[] }>
): GuidedQuestion[] {
  const answered = new Map(verdictsForSite(accountId, origin).map((v) => [v.criterion, v]));
  return criteria
    .filter((c) => c.status === "needs-review" || c.status === "not-measured")
    .map((c) => ({
      criterion: c.id,
      name: c.name,
      level: c.level,
      question: c.plain,
      whyAsking:
        c.status === "not-measured"
          ? `The ${(c.notMeasured ?? []).join(" and ") || "automated"} check did not finish on the last scan, so nothing was measured here.`
          : "No software can decide this one — it needs a person.",
      answered: answered.get(c.id) ?? null,
    }));
}
