import { randomUUID, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "./db.js";

/**
 * Accounts and API keys — the tenancy the product had none of.
 *
 * Everything a scan produces belongs to somebody now: history, and the human
 * verdicts that are the point of guided manual testing. Anonymous scanning
 * is unchanged and still the default — the widget on a public page has no
 * key and needs none.
 */

export interface Account {
  id: string;
  email: string;
  label: string | null;
  createdAt: string;
}

const KEY_PREFIX = "ascan_";

/** SHA-256, not bcrypt. An API key is 256 bits of CSPRNG output, so it has
 *  no guessable structure for a slow hash to protect — the work factor that
 *  matters for passwords buys nothing here, and costs a hash on every
 *  request. Hashing at all is what keeps a leaked table from being a leaked
 *  key set. */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function createAccount(email: string, label?: string): Account {
  const db = getDb();
  if (!db) throw new Error("storage not configured");
  const normalised = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id, email, label, created_at FROM accounts WHERE email = ?").get(normalised) as
    | { id: string; email: string; label: string | null; created_at: string }
    | undefined;
  if (existing) {
    return { id: existing.id, email: existing.email, label: existing.label, createdAt: existing.created_at };
  }
  const account: Account = {
    id: randomUUID(),
    email: normalised,
    label: label ?? null,
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO accounts (id, email, label, created_at) VALUES (?, ?, ?, ?)").run(
    account.id,
    account.email,
    account.label,
    account.createdAt
  );
  return account;
}

/**
 * Mints a key and returns it ONCE. The caller must show it to the human
 * immediately, because nothing can recover it afterwards — only its hash is
 * kept.
 */
export function createApiKey(accountId: string, name: string): { id: string; key: string; prefix: string } {
  const db = getDb();
  if (!db) throw new Error("storage not configured");
  const secret = randomBytes(32).toString("hex");
  const key = `${KEY_PREFIX}${secret}`;
  const id = randomUUID();
  db.prepare(
    "INSERT INTO api_keys (id, account_id, name, key_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, accountId, name, hashKey(key), key.slice(0, KEY_PREFIX.length + 8), new Date().toISOString());
  return { id, key, prefix: key.slice(0, KEY_PREFIX.length + 8) };
}

/**
 * The account a key belongs to, or null.
 *
 * The lookup is by hash, so a wrong key finds no row and the comparison
 * never happens; timingSafeEqual guards the one comparison that does, for
 * the case where an attacker has a hash collision candidate. Revoked keys
 * are stored rather than deleted so an audit can still see they existed.
 */
export function accountForKey(key: string | undefined): Account | null {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const db = getDb();
  if (!db) return null;
  const hash = hashKey(key);
  const row = db
    .prepare(
      `SELECT a.id, a.email, a.label, a.created_at, k.id AS key_id, k.key_hash, k.revoked_at, k.last_used_at
         FROM api_keys k JOIN accounts a ON a.id = k.account_id
        WHERE k.key_hash = ?`
    )
    .get(hash) as
    | { id: string; email: string; label: string | null; created_at: string; key_id: string; key_hash: string; revoked_at: string | null; last_used_at: string | null }
    | undefined;
  if (!row || row.revoked_at) return null;
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(row.key_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // last_used_at is a "when was this key last seen" for a person reviewing
  // their keys, so minute resolution is plenty. Writing it on EVERY request
  // was one write per read in a WAL database on a shared volume; now it is
  // one write per key per minute at most.
  const now = Date.now();
  if (!row.last_used_at || now - Date.parse(row.last_used_at) > 60_000) {
    db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(new Date(now).toISOString(), row.key_id);
  }
  return { id: row.id, email: row.email, label: row.label, createdAt: row.created_at };
}

/** Every account, for the operator. */
export function listAccounts(): Array<Account & { keys: number; scans: number }> {
  const db = getDb();
  if (!db) return [];
  return (
    db
      .prepare(
        `SELECT a.id, a.email, a.label, a.created_at,
                (SELECT COUNT(*) FROM api_keys k WHERE k.account_id = a.id AND k.revoked_at IS NULL) AS keys,
                (SELECT COUNT(*) FROM scans s WHERE s.account_id = a.id) AS scans
           FROM accounts a ORDER BY a.created_at DESC`
      )
      .all() as Array<{ id: string; email: string; label: string | null; created_at: string; keys: number; scans: number }>
  ).map((r) => ({ id: r.id, email: r.email, label: r.label, createdAt: r.created_at, keys: Number(r.keys), scans: Number(r.scans) }));
}

/**
 * Removes an account and everything it owns — the GDPR Article 17 answer.
 * Explicit deletes rather than ON DELETE CASCADE so the order is visible
 * and the count of each is returned to whoever asked.
 */
export function deleteAccount(accountId: string): { scans: number; verdicts: number; keys: number } | null {
  const db = getDb();
  if (!db) return null;
  const exists = db.prepare("SELECT 1 FROM accounts WHERE id = ?").get(accountId);
  if (!exists) return null;
  db.exec("BEGIN");
  try {
    const scans = Number(db.prepare("DELETE FROM scans WHERE account_id = ?").run(accountId).changes);
    const verdicts = Number(db.prepare("DELETE FROM verdicts WHERE account_id = ?").run(accountId).changes);
    db.prepare("DELETE FROM finding_states WHERE account_id = ?").run(accountId);
    db.prepare("DELETE FROM audits WHERE account_id = ?").run(accountId);
    db.prepare("DELETE FROM schedules WHERE account_id = ?").run(accountId);
    const keys = Number(db.prepare("DELETE FROM api_keys WHERE account_id = ?").run(accountId).changes);
    db.prepare("DELETE FROM accounts WHERE id = ?").run(accountId);
    db.exec("COMMIT");
    return { scans, verdicts, keys };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function listApiKeys(accountId: string): Array<{ id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }> {
  const db = getDb();
  if (!db) return [];
  return (
    db
      .prepare(
        "SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE account_id = ? ORDER BY created_at DESC"
      )
      .all(accountId) as Array<{ id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }>
  ).map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    revokedAt: r.revoked_at,
  }));
}

export function revokeApiKey(accountId: string, keyId: string): boolean {
  const db = getDb();
  if (!db) return false;
  const res = db
    .prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL")
    .run(new Date().toISOString(), keyId, accountId);
  return Number(res.changes) > 0;
}

/** The bearer token from an Authorization header, if there is one. */
export function bearerFrom(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1].trim() : undefined;
}
