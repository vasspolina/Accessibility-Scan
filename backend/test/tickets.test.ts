import { describe, it, expect } from "vitest";
import { ticketsFor, ticketsMarkdown, markerFor } from "../src/services/tickets/tickets.js";
import { fileInGithub, fileInJira, markdownToJira, targetError } from "../src/services/tickets/fileTickets.js";
import { missingBrowserHint, parseArgs } from "../src/cli.js";
import { buildApp } from "../src/app.js";

const finding = (over: Record<string, unknown>) => ({
  id: String(Math.random()),
  source: "automated",
  severity: "serious",
  category: "accessibility",
  selector: "img",
  description: "Image has no text alternative.",
  suggestedFix: "Give it alt text that says what it shows.",
  ruleId: "image-alt",
  wcagCriterion: "1.1.1",
  wcagLevel: "A",
  ...over,
});

const report = (url: string, findings: unknown[]) =>
  ({
    url,
    scannedAt: "2026-11-22T00:00:00.000Z",
    score: 70,
    summary: { critical: 0, serious: findings.length, moderate: 0, minor: 0, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    conformance: {
      standard: "WCAG 2.1 Level AA (EN 301 549)",
      failed: 0,
      noIssuesFound: 0,
      needsReview: 0,
      notMeasured: 0,
      total: 0,
      failedByLevel: { A: 0, AA: 0 },
      criteria: [],
    },
    meta: { axeVersion: "4", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "skipped_no_key" },
  }) as never;

const shop = report("https://shop.test/products/", [
  finding({ selector: "img.a", fingerprint: "aaaaaaaaaaaaaaaa", elementSnippet: '<img src="a.png">' }),
  finding({ selector: "img.b", fingerprint: "bbbbbbbbbbbbbbbb" }),
  finding({ selector: "button.x", ruleId: "button-name", wcagCriterion: "4.1.2", severity: "critical", description: "Button has no name.", fingerprint: "cccccccccccccccc" }),
  finding({ selector: "a", ruleId: "link-name", triage: { state: "ignored", note: null, decidedBy: "T", decidedAt: "x" } }),
  finding({ selector: ".hero", category: "design-clarity", ruleId: "clarity" }),
]);

describe("tickets from a report", () => {
  it("makes one ticket per fault, worst first, listing every element", () => {
    const drafts = ticketsFor([shop]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].severity).toBe("critical");
    expect(drafts[1].elements).toBe(2);
    expect(drafts[1].body).toContain("`img.a`");
    expect(drafts[1].body).toContain("`img.b`");
    expect(drafts[1].title).toBe("WCAG 1.1.1: Image has no text alternative. (/products)");
    expect(drafts[1].body).toContain("EN 301 549 9.1.1.1");
    expect(drafts[1].body).toContain(markerFor(drafts[1].key));
    expect(drafts[1].labels).toEqual(["accessibility", "severity:serious", "wcag-1.1.1"]);
  });

  it("leaves out design notes and findings the owner set aside", () => {
    const all = ticketsMarkdown(ticketsFor([shop]));
    expect(all).not.toContain("link-name");
    expect(all).not.toContain("clarity");
  });

  it("gives the same fault the same key on the next run, and another page its own", () => {
    const again = ticketsFor([report("https://shop.test/products", [finding({ selector: "img.z" })])]);
    expect(again[0].key).toBe(ticketsFor([shop])[1].key);
    const other = ticketsFor([report("https://shop.test/about", [finding({})])]);
    expect(other[0].key).not.toBe(again[0].key);
  });

  it("cannot be closed early by backticks in a stranger's snippet", () => {
    const d = ticketsFor([report("https://x.test/", [finding({ elementSnippet: "<p>```</p>" })])])[0];
    expect(d.body).toContain("````html\n<p>```</p>\n````");
  });
});

describe("filing in GitHub", () => {
  it("skips a fault already open and files the rest, with the token only in the header", async () => {
    const drafts = ticketsFor([shop]);
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (!init?.method) {
        return Response.json([{ body: `x ${markerFor(drafts[0].key)}`, html_url: "https://github.com/o/r/issues/1" }]);
      }
      return Response.json({ html_url: "https://github.com/o/r/issues/2" }, { status: 201 });
    }) as typeof fetch;
    const out = await fileInGithub({ kind: "github", repo: "o/r", token: "ghp_secret" }, drafts, fetcher);
    expect(out.map((o) => o.status)).toEqual(["exists", "created"]);
    expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(1);
    expect(calls.every((c) => !c.url.includes("ghp_secret"))).toBe(true);
    expect(JSON.stringify(out)).not.toContain("ghp_secret");
  });

  it("stops at a refused token instead of trying every ticket", async () => {
    let posts = 0;
    const fetcher = (async (_u: string, init?: RequestInit) => {
      if (init?.method) posts++;
      return init?.method ? new Response("", { status: 403 }) : Response.json([]);
    }) as typeof fetch;
    const out = await fileInGithub({ kind: "github", repo: "o/r", token: "t" }, ticketsFor([shop]), fetcher);
    expect(posts).toBe(1);
    expect(out[0].error).toContain("403");
  });
});

describe("filing in Jira", () => {
  it("writes the body as wiki markup and finds an open ticket by its label", async () => {
    const drafts = ticketsFor([shop]);
    const seen: string[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      seen.push(url);
      if (!init?.method) return Response.json({ issues: url.includes(drafts[0].key) ? [{ key: "WEB-1" }] : [] });
      const body = JSON.parse(String(init.body));
      expect(body.fields.description).toContain("h3. What to do");
      expect(body.fields.labels).toContain(`a11y-${drafts[1].key}`);
      expect(body.fields.labels).toContain("severity-serious");
      return Response.json({ key: "WEB-2" });
    }) as typeof fetch;
    const out = await fileInJira({ kind: "jira", site: "https://team.atlassian.net", email: "a@b.test", token: "t", projectKey: "WEB" }, drafts, fetcher);
    expect(out.map((o) => o.url)).toEqual(["https://team.atlassian.net/browse/WEB-1", "https://team.atlassian.net/browse/WEB-2"]);
    expect(seen.every((u) => u.startsWith("https://team.atlassian.net/"))).toBe(true);
  });

  it("converts Markdown to Jira's markup", () => {
    expect(markdownToJira("### Where\n- `img.a`\n  - x\n**Page:** y\n<!-- m -->")).toBe("h3. Where\n* {{img.a}}\n** x\n*Page:* y");
  });

  it("only ever talks to an atlassian.net site", () => {
    expect(targetError({ kind: "jira", site: "https://evil.test", email: "a@b.test", token: "t", projectKey: "WEB" })).toMatch(/atlassian/);
    expect(targetError({ kind: "jira", site: "https://team.atlassian.net.evil.test", email: "a@b.test", token: "t", projectKey: "WEB" })).toMatch(/atlassian/);
    expect(targetError({ kind: "github", repo: "../../etc", token: "t" })).toMatch(/owner\/name/);
  });
});

describe("the ticket routes", () => {
  it("drafts without a token and never echoes one back on a bad request", async () => {
    const app = await buildApp();
    const draft = await app.inject({ method: "POST", url: "/api/tickets/draft", payload: { reports: [shop] } });
    expect(draft.statusCode).toBe(200);
    expect(draft.json().tickets).toHaveLength(2);
    const bad = await app.inject({ method: "POST", url: "/api/tickets", payload: { reports: [shop], target: { kind: "github", repo: "o/r", token: "ghp_leak", extra: 1 }, keys: ["nope"] } });
    expect(bad.statusCode).toBe(400);
    expect(bad.body).not.toContain("ghp_leak");
    await app.close();
  });
});

describe("the command line", () => {
  it("files GitHub issues only with a token in the environment", () => {
    const before = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    expect(parseArgs(["https://x.test", "--github-issues", "o/r"])).toEqual({ error: expect.stringContaining("GITHUB_TOKEN") });
    process.env.GITHUB_TOKEN = "t";
    expect(parseArgs(["https://x.test", "--github-issues", "o/r", "--tickets", "t.md"])).toMatchObject({ githubIssues: "o/r", tickets: "t.md" });
    expect(parseArgs(["https://x.test", "--github-issues", "nope"])).toEqual({ error: "--github-issues takes owner/name" });
    if (before === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = before;
  });
});

describe("a command installed without its browser", () => {
  it("says the one line to run, with the pinned Playwright version", () => {
    const hint = missingBrowserHint("browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1200/chrome");
    expect(hint).toMatch(/^Chromium is not installed for the scanner\. Run: npx playwright@\d+\.\d+\.\d+ install chromium --with-deps$/);
    expect(missingBrowserHint("Page returned 404")).toBe("Page returned 404");
  });
});
