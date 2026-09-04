import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The scheduler's tick, with the scan and the mail injected. What is
 * tested is the decision: when a run is due, what "worse" means, whether
 * someone is told, and that a failing schedule moves on rather than
 * blocking the pool every minute.
 */
let dir: string;
let accounts: typeof import("../src/storage/accounts.js");
let schedules: typeof import("../src/storage/schedules.js");
let scheduler: typeof import("../src/services/scheduler.js");

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-sched-"));
  process.env.DB_PATH = join(dir, "s.db");
  accounts = await import("../src/storage/accounts.js");
  schedules = await import("../src/storage/schedules.js");
  scheduler = await import("../src/services/scheduler.js");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const report = (url: string, score: number, prints: string[]) =>
  ({
    url,
    scannedAt: new Date().toISOString(),
    score,
    summary: { critical: 0, serious: prints.length, moderate: 0, minor: 0, total: prints.length },
    categorySummary: { accessibility: prints.length, designClarity: 0, darkPattern: 0 },
    findings: prints.map((p) => ({
      id: p, source: "automated", severity: "serious", category: "accessibility", selector: "x", description: "d", suggestedFix: "f", fingerprint: p,
    })),
    meta: { axeVersion: "4", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "skipped_no_key" },
  }) as never;

describe("a scheduled scan", () => {
  it("runs when due, saves, and does not write to anyone on a first or unchanged run", async () => {
    const a = accounts.createAccount("s1@test.invalid");
    const { schedule } = schedules.createSchedule(a.id, { url: "https://s1.test/", everyHours: 24, notifyEmail: "o@test.invalid" });
    const mails: string[] = [];
    const mailer = async (to: string, _r: unknown, subject?: string) => { mails.push(subject ?? ""); return { ok: true }; };

    const first = await scheduler.tick(async (u) => report(u, 80, ["aaaaaaaaaaaaaaaa"]), mailer);
    expect(first?.ok).toBe(true);
    expect(first?.scoreChange).toBeNull();
    expect(mails).toHaveLength(0);
    const after = schedules.getSchedule(a.id, schedule!.id)!;
    expect(after.lastScore).toBe(80);
    expect(after.lastScanId).toBeTruthy();
    // Not due again until the interval has passed.
    expect(await scheduler.tick(async (u) => report(u, 80, []), mailer)).toBeNull();

    // Same again, a day later: nothing to say.
    const later = new Date(Date.now() + 25 * 3_600_000);
    const second = await scheduler.tick(async (u) => report(u, 80, ["aaaaaaaaaaaaaaaa"]), mailer, later);
    expect(second?.ok).toBe(true);
    expect(second?.scoreChange).toBe(0);
    expect(second?.newFindings).toBe(0);
    expect(mails).toHaveLength(0);
  });

  it("writes when the site got worse — a lower score or a finding it did not have", async () => {
    const a = accounts.createAccount("s2@test.invalid");
    schedules.createSchedule(a.id, { url: "https://s2.test/", everyHours: 1, notifyEmail: "o@test.invalid" });
    const mails: string[] = [];
    const mailer = async (_to: string, _r: unknown, subject?: string) => { mails.push(subject ?? ""); return { ok: true }; };
    await scheduler.tick(async (u) => report(u, 80, ["aaaaaaaaaaaaaaaa"]), mailer);
    const t2 = new Date(Date.now() + 2 * 3_600_000);
    const out = await scheduler.tick(async (u) => report(u, 70, ["aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb"]), mailer, t2);
    expect(out?.notified).toBe(true);
    expect(out?.newFindings).toBe(1);
    expect(mails[0]).toContain("got worse");
    expect(mails[0]).toContain("80 → 70");
    expect(mails[0]).toContain("1 new finding");
  });

  it("records a failure and moves on rather than retrying every tick", async () => {
    const a = accounts.createAccount("s3@test.invalid");
    const { schedule } = schedules.createSchedule(a.id, { url: "https://dead.test/", everyHours: 6 });
    const out = await scheduler.tick(async () => { throw new Error("Could not load the page"); }, async () => ({ ok: true }));
    expect(out?.ok).toBe(false);
    const after = schedules.getSchedule(a.id, schedule!.id)!;
    expect(after.lastError).toContain("Could not load");
    expect(new Date(after.nextRunAt).getTime()).toBeGreaterThan(Date.now() + 5 * 3_600_000);
  });
});
