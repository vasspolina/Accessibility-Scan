import { DatabaseSync } from "node:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Storage, opt-in and self-declaring.
 *
 * The product has run without a database since it started, and a great deal
 * of its design assumes that: the scan pipeline is pure, the widget is
 * anonymous, and a report is a value returned once. Persistence is added
 * WITHOUT breaking that — every route below works exactly as before when no
 * database is configured, and the features that need one say so rather than
 * pretending.
 *
 * That contract is the one MAIL_API_KEY already established: "absent by
 * default: the feature is built, and without these it reports itself as not
 * set up rather than failing silently."
 *
 * Why SQLite, and why node:sqlite. The scale this serves is two concurrent
 * renders and a scan every few minutes, which is three orders of magnitude
 * below where Postgres starts earning its operational cost. node:sqlite is
 * in Node itself since 22.5, so there is no native module to compile in the
 * Playwright base image and no dependency to keep in step with it. Every
 * query lives behind the small functions in this directory, so swapping the
 * engine later is a change here and nowhere else.
 *
 * DURABILITY IS THE DEPLOYER'S JOB, and this module refuses to pretend
 * otherwise. A container filesystem is erased on every deploy. Setting
 * DB_PATH to a path inside a mounted volume makes the data durable; setting
 * it to an ordinary container path gives you storage that works perfectly
 * and vanishes at the next deploy. `storageStatus()` reports which of those
 * you have, and the API says it out loud.
 */

let db: DatabaseSync | null = null;
let initError: string | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  label       TEXT,
  created_at  TEXT NOT NULL
);

-- Keys are stored as a SHA-256 hash and never in the clear: a database that
-- leaks must not hand over the keys with it. The prefix is kept so a person
-- can recognise which key a row refers to without being able to use it.
CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  prefix       TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS api_keys_account ON api_keys(account_id);

-- One row per scan, with the full report kept as JSON. Deliberately not
-- normalised into findings tables: the report's shape is owned by
-- types/report.ts and validated by zod there, and a second schema mirroring
-- it would be a second place to update every time a probe changes.
CREATE TABLE IF NOT EXISTS scans (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  url         TEXT NOT NULL,
  origin      TEXT NOT NULL,
  scanned_at  TEXT NOT NULL,
  score       INTEGER NOT NULL,
  report_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scans_account_time ON scans(account_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS scans_origin_time ON scans(account_id, origin, scanned_at DESC);

-- Guided manual testing: a person's answer to a question the scan cannot
-- decide. Keyed by ORIGIN rather than by scan, because that is what makes it
-- worth recording — answer "do your videos have captions" once and it holds
-- for every later scan of the same site until someone changes it.
CREATE TABLE IF NOT EXISTS verdicts (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  origin      TEXT NOT NULL,
  criterion   TEXT NOT NULL,
  status      TEXT NOT NULL,
  note        TEXT,
  evidence    TEXT,
  decided_by  TEXT NOT NULL,
  decided_at  TEXT NOT NULL,
  supersedes  TEXT,
  -- Migration 2: what the decision was about, not only what it says.
  page_url       TEXT,
  answers_check  TEXT
);
CREATE INDEX IF NOT EXISTS verdicts_lookup ON verdicts(account_id, origin, criterion, decided_at DESC);

-- Triage: what an owner has decided about a finding — ignored, a false
-- positive, fixed. Keyed by the finding's fingerprint (rule and selector),
-- which is the identity a finding keeps across scans. Never overwrites,
-- for the same reason verdicts never do.
CREATE TABLE IF NOT EXISTS finding_states (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  origin      TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  state       TEXT NOT NULL,
  note        TEXT,
  decided_by  TEXT NOT NULL,
  decided_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS finding_states_lookup ON finding_states(account_id, origin, fingerprint, decided_at DESC);

-- Site audits, the multi-page counterpart of scans. Kept whole as JSON for
-- the same reason scans are.
CREATE TABLE IF NOT EXISTS audits (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  entry_url     TEXT NOT NULL,
  origin        TEXT NOT NULL,
  scanned_at    TEXT NOT NULL,
  average_score INTEGER NOT NULL,
  audit_json    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audits_origin_time ON audits(account_id, origin, scanned_at DESC);

-- Scheduled scans: the subscription. A row is a standing instruction; the
-- scheduler runs whatever is due and writes back when it did.
CREATE TABLE IF NOT EXISTS schedules (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  url           TEXT NOT NULL,
  every_hours   INTEGER NOT NULL,
  notify_email  TEXT,
  enabled       INTEGER NOT NULL DEFAULT 1,
  next_run_at   TEXT NOT NULL,
  last_run_at   TEXT,
  last_score    INTEGER,
  last_scan_id  TEXT,
  last_error    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS schedules_due ON schedules(enabled, next_run_at);
`;

/**
 * Schema changes after the first release, in order. Each entry runs once,
 * and PRAGMA user_version records how far a database has got.
 *
 * SCHEMA above creates the tables as they are NOW, for a new file. An
 * existing file skips those CREATEs (IF NOT EXISTS) and needs the ALTERs
 * here to catch up. Without this list the first column added to any table
 * failed on every existing deployment, silently: the CREATE was a no-op and
 * the next INSERT named a column that was not there. Add a migration for
 * every change to SCHEMA; never edit an entry that has shipped.
 */
const MIGRATIONS: Array<{ version: number; sql: string }> = [
  // 1: the tables as first shipped. A fresh database gets them from SCHEMA
  //    and simply records the version.
  { version: 1, sql: "" },
  // 2: verdicts can name the page they were checked on and the undecided
  //    item they answer, so a decision is tied to what it decided.
  {
    version: 2,
    sql: `ALTER TABLE verdicts ADD COLUMN page_url TEXT;
          ALTER TABLE verdicts ADD COLUMN answers_check TEXT;`,
  },
  // 3: triage, site audits and schedules. New tables only, so the CREATE
  //    IF NOT EXISTS in SCHEMA does the work; the entry records the step.
  { version: 3, sql: "" },
];
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

function migrate(handle: DatabaseSync): void {
  const { user_version } = handle.prepare("PRAGMA user_version").get() as { user_version: number };
  for (const m of MIGRATIONS) {
    if (m.version <= user_version) continue;
    handle.exec("BEGIN");
    try {
      if (m.sql) handle.exec(m.sql);
      handle.exec(`PRAGMA user_version = ${m.version}`);
      handle.exec("COMMIT");
      logger.info({ version: m.version }, "storage migrated");
    } catch (err) {
      handle.exec("ROLLBACK");
      throw err;
    }
  }
}

function open(): DatabaseSync | null {
  if (db || initError) return db;
  if (!env.DB_PATH) return null;
  try {
    if (env.DB_PATH !== ":memory:") mkdirSync(dirname(env.DB_PATH), { recursive: true });
    const handle = new DatabaseSync(env.DB_PATH);
    // WAL keeps a reader from blocking the writer, which matters because a
    // scan holds its transaction open only briefly but several may land at
    // once behind the render queue.
    handle.exec("PRAGMA journal_mode = WAL");
    handle.exec("PRAGMA foreign_keys = ON");
    const fresh = (handle.prepare("PRAGMA user_version").get() as { user_version: number }).user_version === 0;
    handle.exec(SCHEMA);
    // A fresh file already has the current shape from SCHEMA; it only needs
    // the version stamped. An older file walks the list.
    if (fresh) handle.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    else migrate(handle);
    db = handle;
    logger.info({ path: env.DB_PATH, durable: env.DB_DURABLE }, "storage ready");
  } catch (err) {
    // A broken database must not take the scanner down with it: scanning is
    // the product, and history is an addition to it.
    initError = err instanceof Error ? err.message : String(err);
    logger.error({ err, path: env.DB_PATH }, "storage unavailable — scans still run, nothing is saved");
  }
  return db;
}

/** The handle, or null when no storage is configured or it failed to open. */
export function getDb(): DatabaseSync | null {
  return open();
}

/**
 * Closes the handle. The next call to getDb() opens a fresh one.
 *
 * Used on shutdown, and by the tests to prove that what was written is on
 * disk rather than in this process's memory — a persistence layer that only
 * works while the process lives is not one.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface StorageStatus {
  configured: boolean;
  /** True only when the deployer has said the path is on a mounted volume. */
  durable: boolean;
  error?: string;
  /** What to tell a caller who asked for a stored feature and cannot have it. */
  reason?: string;
  /** How much there is. A stored report is ~140 KB, a third of it
   *  screenshots, and a team scanning hourly stores a gigabyte a year per
   *  site — a fact the deployer needs before the disk tells them. */
  size?: { bytes: number; scans: number; accounts: number; verdicts: number };
  /** What is pruned, so the number above has a ceiling. */
  retention?: { scanDays: number; scansPerSite: number };
  schemaVersion?: number;
}

function sizeOf(handle: DatabaseSync): StorageStatus["size"] {
  const count = (table: string) =>
    Number((handle.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
  let bytes = 0;
  try {
    if (env.DB_PATH && env.DB_PATH !== ":memory:") {
      bytes = statSync(env.DB_PATH).size;
      // WAL pages not yet checkpointed live beside the file.
      try {
        bytes += statSync(`${env.DB_PATH}-wal`).size;
      } catch {
        // No WAL file at the moment — nothing outstanding.
      }
    }
  } catch {
    // Unreadable size is reported as 0 with the counts still honest.
  }
  return { bytes, scans: count("scans"), accounts: count("accounts"), verdicts: count("verdicts") };
}

export function storageStatus(): StorageStatus {
  open();
  if (initError) {
    return { configured: false, durable: false, error: initError, reason: "Storage is configured but could not be opened." };
  }
  if (!env.DB_PATH) {
    return { configured: false, durable: false, reason: "Storage is not set up. Set DB_PATH to enable accounts, history and verdicts." };
  }
  return {
    configured: true,
    durable: env.DB_DURABLE,
    size: db ? sizeOf(db) : undefined,
    retention: { scanDays: env.SCAN_RETENTION_DAYS, scansPerSite: env.SCANS_PER_SITE_MAX },
    schemaVersion: SCHEMA_VERSION,
    ...(env.DB_DURABLE
      ? {}
      : {
          reason:
            "Storage is working but not marked durable. A container filesystem is erased on deploy — mount a volume and set DB_DURABLE=true once DB_PATH points inside it.",
        }),
  };
}

/** Test seam: drops the handle so a new DB_PATH takes effect. */
export function resetDbForTests(): void {
  db?.close();
  db = null;
  initError = null;
}
