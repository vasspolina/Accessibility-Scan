import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The storage layer, exercised against a real database file.
 *
 * Not a mock, and deliberately. Every rule these modules enforce — a key that
 * only ever exists as a hash, a verdict that supersedes rather than
 * overwrites, an account that cannot see another's rows — is enforced in SQL
 * or in a query's WHERE clause, and a mocked db would test the mock.
 *
 * The file is thrown away afterwards. It has to be a file rather than
 * ":memory:" because one test restarts the process's handle to prove the
 * data survives it.
 */

let dir: string;
let accounts: typeof import("../src/storage/accounts.js");
let scans: typeof import("../src/storage/scans.js");
let verdicts: typeof import("../src/storage/verdicts.js");
let db: typeof import("../src/storage/db.js");

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-storage-"));
  process.env.DB_PATH = join(dir, "test.db");
  process.env.DB_DURABLE = "false";
  db = await import("../src/storage/db.js");
  accounts = await import("../src/storage/accounts.js");
  scans = await import("../src/storage/scans.js");
  verdicts = await import("../src/storage/verdicts.js");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function report(url: string, score: number, criteria: unknown[] = []) {
  return {
    url,
    scannedAt: new Date().toISOString(),
    score,
    summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
    categorySummary: { accessibility: 0, designClarity: 0, darkPattern: 0 },
    findings: [],
    conformance: {
      standard: "WCAG 2.1 Level AA (EN 301 549)",
      failed: 0,
      noIssuesFound: 0,
      needsReview: criteria.length,
      notMeasured: 0,
      total: criteria.length,
      failedByLevel: { A: 0, AA: 0 },
      criteria,
    },
  } as never;
}

describe("storage, when a deployer has configured it", () => {
  it("reports itself configured but not durable unless the deployer says so", () => {
    const status = db.storageStatus();
    expect(status.configured).toBe(true);
    // The distinction the module refuses to blur: storage that works
    // perfectly and vanishes at the next deploy is not durable storage.
    expect(status.durable).toBe(false);
  });
});

describe("accounts and API keys", () => {
  it("shows a key exactly once and keeps only its hash", () => {
    const account = accounts.createAccount("one@test.invalid", "One");
    const created = accounts.createApiKey(account.id, "ci");
    expect(created.key).toMatch(/^ascan_/);

    // The listing a person sees later: enough to recognise the key, never
    // enough to use it.
    const listed = accounts.listApiKeys(account.id);
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain(created.key);

    expect(accounts.accountForKey(created.key)?.id).toBe(account.id);
  });

  it("refuses a wrong key, a revoked key, and no key at all", () => {
    const account = accounts.createAccount("two@test.invalid");
    const created = accounts.createApiKey(account.id, "ci");

    expect(accounts.accountForKey("ascan_not_a_real_key")).toBeNull();
    expect(accounts.accountForKey(null)).toBeNull();
    expect(accounts.accountForKey("")).toBeNull();

    expect(accounts.revokeApiKey(account.id, created.id)).toBe(true);
    expect(accounts.accountForKey(created.key)).toBeNull();
    // Revoking twice is not a success the second time — otherwise a caller
    // cannot tell "revoked it" from "there was nothing there".
    expect(accounts.revokeApiKey(account.id, created.id)).toBe(false);
  });

  it("will not let one account revoke another's key", () => {
    const mine = accounts.createAccount("mine@test.invalid");
    const theirs = accounts.createAccount("theirs@test.invalid");
    const key = accounts.createApiKey(theirs.id, "ci");
    expect(accounts.revokeApiKey(mine.id, key.id)).toBe(false);
    expect(accounts.accountForKey(key.key)?.id).toBe(theirs.id);
  });

  it("parses a bearer header and nothing else", () => {
    expect(accounts.bearerFrom("Bearer ascan_abc")).toBe("ascan_abc");
    expect(accounts.bearerFrom("bearer ascan_abc")).toBe("ascan_abc");
    expect(accounts.bearerFrom("ascan_abc")).toBeUndefined();
    expect(accounts.bearerFrom(undefined)).toBeUndefined();
  });
});

describe("scan history", () => {
  it("keeps scans per account and reports the change since the previous one", () => {
    const account = accounts.createAccount("history@test.invalid");
    scans.saveScan(account.id, report("https://a.test/one", 70));
    scans.saveScan(account.id, report("https://a.test/two", 82));

    const list = scans.listScans(account.id, {});
    expect(list).toHaveLength(2);
    // Newest first, and the newest is +12 on the same origin.
    expect(list[0].score).toBe(82);
    expect(list[0].scoreChange).toBe(12);
    // Nothing came before the first one, so it carries no change at all —
    // zero would read as "no movement", which is a different fact.
    expect(list[1].scoreChange).toBeUndefined();
  });

  it("does not show one account another's history", () => {
    const mine = accounts.createAccount("a@test.invalid");
    const theirs = accounts.createAccount("b@test.invalid");
    const id = scans.saveScan(theirs.id, report("https://secret.test/", 50));
    expect(scans.listScans(mine.id, {})).toHaveLength(0);
    expect(scans.getScan(mine.id, id)).toBeNull();
    expect(scans.deleteScan(mine.id, id)).toBe(false);
    expect(scans.getScan(theirs.id, id)?.score).toBe(50);
  });

  it("survives the handle being closed and reopened", () => {
    const account = accounts.createAccount("durable@test.invalid");
    scans.saveScan(account.id, report("https://kept.test/", 61));
    db.closeDb();
    expect(scans.listScans(account.id, {})[0].score).toBe(61);
  });
});

describe("verdicts — the human half of the report", () => {
  const site = "https://verdicts.test/some/page";

  it("refuses a criterion no report can read", () => {
    const account = accounts.createAccount("v1@test.invalid");
    const { verdict, error } = verdicts.recordVerdict(account.id, {
      origin: site,
      criterion: "9.9.9",
      status: "supports",
      decidedBy: "Tester",
    });
    expect(verdict).toBeUndefined();
    expect(error).toContain("9.9.9");
  });

  it("refuses a verdict nobody signed", () => {
    const account = accounts.createAccount("v2@test.invalid");
    const { error } = verdicts.recordVerdict(account.id, {
      origin: site,
      criterion: "1.2.2",
      status: "supports",
      decidedBy: "   ",
    });
    expect(error).toContain("decidedBy");
  });

  it("holds for the whole site, not for one page", () => {
    const account = accounts.createAccount("v3@test.invalid");
    verdicts.recordVerdict(account.id, {
      origin: site,
      criterion: "1.2.2",
      status: "not-applicable",
      decidedBy: "Tester",
    });
    // Asked again about a different page of the same site, the answer is
    // already on file — which is the entire reason it is worth recording.
    const found = verdicts.latestVerdict(account.id, "https://verdicts.test/another", "1.2.2");
    expect(found?.status).toBe("not-applicable");
  });

  it("supersedes rather than overwrites, keeping who said what and when", () => {
    const account = accounts.createAccount("v4@test.invalid");
    const first = verdicts.recordVerdict(account.id, {
      origin: site,
      criterion: "1.2.2",
      status: "does-not-support",
      decidedBy: "First",
    }).verdict!;
    const second = verdicts.recordVerdict(account.id, {
      origin: site,
      criterion: "1.2.2",
      status: "supports",
      note: "Captions added.",
      decidedBy: "Second",
    }).verdict!;

    expect(second.supersedes).toBe(first.id);
    const history = verdicts.verdictHistory(account.id, site, "1.2.2");
    expect(history).toHaveLength(2);
    // The old decision is still readable. An accessibility statement is a
    // document people rely on; its history is part of it.
    expect(history.map((v) => v.decidedBy)).toContain("First");
    expect(verdicts.verdictsForSite(account.id, site)).toHaveLength(1);
    expect(verdicts.verdictsForSite(account.id, site)[0].decidedBy).toBe("Second");
  });

  it("asks only what the scan could not decide, and shrinks as it is answered", () => {
    const account = accounts.createAccount("v5@test.invalid");
    const criteria = [
      { id: "1.1.1", name: "Non-text Content", level: "A" as const, status: "no-issues-found", plain: "Do images have a description?" },
      { id: "1.2.2", name: "Captions", level: "A" as const, status: "needs-review", plain: "Do your videos have captions?" },
      { id: "1.4.3", name: "Contrast", level: "AA" as const, status: "failed", plain: "Is the text readable?" },
      { id: "2.4.7", name: "Focus Visible", level: "AA" as const, status: "not-measured", plain: "Can you see where you are?", notMeasured: ["keyboard"] },
    ];
    const before = verdicts.guidedQuestions(account.id, site, criteria);
    // A criterion the scan settled either way is not a question.
    expect(before.map((q) => q.criterion).sort()).toEqual(["1.2.2", "2.4.7"]);
    expect(before.every((q) => q.answered === null)).toBe(true);
    // A not-measured row says why, rather than reading like a manual one.
    expect(before.find((q) => q.criterion === "2.4.7")!.whyAsking).toContain("keyboard");

    verdicts.recordVerdict(account.id, { origin: site, criterion: "1.2.2", status: "supports", decidedBy: "Tester" });
    const after = verdicts.guidedQuestions(account.id, site, criteria);
    expect(after.filter((q) => q.answered === null)).toHaveLength(1);
    expect(after.find((q) => q.criterion === "1.2.2")!.answered!.status).toBe("supports");
  });

  it("does not show one account another's verdicts", () => {
    const mine = accounts.createAccount("v6@test.invalid");
    const theirs = accounts.createAccount("v7@test.invalid");
    verdicts.recordVerdict(theirs.id, { origin: site, criterion: "1.2.2", status: "supports", decidedBy: "Them" });
    expect(verdicts.verdictsForSite(mine.id, site)).toHaveLength(0);
    expect(verdicts.latestVerdict(mine.id, site, "1.2.2")).toBeNull();
  });
});
