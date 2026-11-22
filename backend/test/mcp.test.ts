import { describe, it, expect } from "vitest";
import { createMcpHandler, digestReport, digestSite, PROTOCOL_VERSIONS, TOOLS, type ScanDeps } from "../src/mcp.js";
import type { AccessibilityFinding, AccessibilityReport } from "../src/types/report.js";

/**
 * The scanner as a tool for a coding assistant.
 *
 * Two things are tested. The protocol, because a client that gets one wrong
 * answer at the handshake shows the user no tools and no reason. And what
 * the assistant is told, because it repeats it: an answer that reads as
 * "this page passes" becomes a sentence in someone's pull request.
 */

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: Math.random().toString(),
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "main > a.cta",
    description: "The link has no name.",
    suggestedFix: "Give it text.",
    ruleId: "link-name",
    wcagCriterion: "2.4.4",
    wcagLevel: "A",
    ...overrides,
  };
}

function report(url: string, score: number, findings: AccessibilityFinding[]): AccessibilityReport {
  return {
    url,
    scannedAt: "2026-11-22T10:00:00.000Z",
    score,
    summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    meta: { axeVersion: "1", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
  };
}

function deps(overrides: Partial<ScanDeps> = {}): ScanDeps & { scanned: string[] } {
  const scanned: string[] = [];
  return {
    scanned,
    scanPage: async (url) => {
      scanned.push(url);
      return report(url, 80, [finding()]);
    },
    readSitemapPages: async () => [],
    ...overrides,
  };
}

const request = (method: string, params?: object, id: number | string = 1) => ({ jsonrpc: "2.0", id, method, params });

describe("the handshake", () => {
  it("answers in the revision the client asked for, when it knows it", async () => {
    const handle = createMcpHandler(deps());
    const res = (await handle(request("initialize", { protocolVersion: "2025-03-26", capabilities: {} }))) as any;
    expect(res.id).toBe(1);
    expect(res.result.protocolVersion).toBe("2025-03-26");
    expect(res.result.capabilities).toEqual({ tools: {} });
    expect(res.result.serverInfo.name).toBe("a11y-scan");
  });

  it("offers its newest revision to a client that asks for one it does not know", async () => {
    const handle = createMcpHandler(deps());
    const res = (await handle(request("initialize", { protocolVersion: "2099-01-01" }))) as any;
    expect(res.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("says nothing back to a notification", async () => {
    const handle = createMcpHandler(deps());
    expect(await handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    // An unknown notification as well: there is no id to answer to.
    expect(await handle({ jsonrpc: "2.0", method: "notifications/whatever" })).toBeNull();
  });

  it("answers a ping", async () => {
    const handle = createMcpHandler(deps());
    expect(await handle(request("ping", undefined, "p1"))).toEqual({ jsonrpc: "2.0", id: "p1", result: {} });
  });

  it("refuses an unknown method and a message that is not JSON-RPC", async () => {
    const handle = createMcpHandler(deps());
    expect(((await handle(request("resources/list"))) as any).error.code).toBe(-32601);
    expect(((await handle({ id: 1, method: "ping" })) as any).error.code).toBe(-32600);
    expect(((await handle([request("ping")])) as any).error.code).toBe(-32600);
  });
});

describe("tools/list", () => {
  it("lists both tools with a schema a client can build a form from", async () => {
    const handle = createMcpHandler(deps());
    const res = (await handle(request("tools/list"))) as any;
    expect(res.result.tools.map((t: any) => t.name)).toEqual(["scan_page", "scan_site"]);
    for (const tool of res.result.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description.length).toBeGreaterThan(40);
    }
    expect(TOOLS[0].inputSchema.required).toEqual(["url"]);
  });
});

describe("scan_page", () => {
  it("scans the address and returns the digest as text", async () => {
    const d = deps();
    const res = (await createMcpHandler(d)(
      request("tools/call", { name: "scan_page", arguments: { url: "http://localhost:3000/contact" } })
    )) as any;
    // localhost is the point of running on the developer's machine.
    expect(d.scanned).toEqual(["http://localhost:3000/contact"]);
    expect(res.result.isError).toBeUndefined();
    expect(res.result.content[0].type).toBe("text");
    expect(res.result.content[0].text).toContain("Score: 80/100");
    expect(res.result.content[0].text).toContain("link-name");
  });

  it("refuses file:// and a string that is not an address, as a tool error the assistant can read", async () => {
    const d = deps();
    const handle = createMcpHandler(d);
    const file = (await handle(request("tools/call", { name: "scan_page", arguments: { url: "file:///etc/passwd" } }))) as any;
    expect(file.result.isError).toBe(true);
    expect(file.result.content[0].text).toContain("Only http and https");
    const junk = (await handle(request("tools/call", { name: "scan_page", arguments: { url: "not a url" } }))) as any;
    expect(junk.result.isError).toBe(true);
    const missing = (await handle(request("tools/call", { name: "scan_page", arguments: {} }))) as any;
    expect(missing.result.isError).toBe(true);
    expect(d.scanned).toEqual([]);
  });

  it("reports a scan that failed as the tool's answer, not a protocol error", async () => {
    const handle = createMcpHandler(
      deps({
        scanPage: async () => {
          throw new Error("The page took too long to load.");
        },
      })
    );
    const res = (await handle(request("tools/call", { name: "scan_page", arguments: { url: "https://example.com" } }))) as any;
    expect(res.error).toBeUndefined();
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toBe("Scan failed: The page took too long to load.");
  });

  it("refuses a tool it does not have", async () => {
    const res = (await createMcpHandler(deps())(request("tools/call", { name: "delete_site", arguments: {} }))) as any;
    expect(res.error.code).toBe(-32602);
  });
});

describe("scan_site", () => {
  it("scans the pages a sitemap lists, up to the limit, and says what it left", async () => {
    const d = deps({
      readSitemapPages: async () => ["https://a.test/", "https://a.test/b", "https://a.test/c", "ftp://a.test/x"],
    });
    const res = (await createMcpHandler(d)(
      request("tools/call", { name: "scan_site", arguments: { sitemap: "https://a.test/sitemap.xml", maxPages: 2 } })
    )) as any;
    expect(d.scanned).toEqual(["https://a.test/", "https://a.test/b"]);
    // The ftp address was never a page, so one page is left, not two.
    expect(res.result.content[0].text).toContain("1 more page was listed and not scanned (maxPages 2).");
  });

  it("goes on past a page that cannot be scanned and names it", async () => {
    const d = deps({
      scanPage: async (url) => {
        if (url.endsWith("/broken")) throw new Error("timed out");
        return report(url, 90, [finding()]);
      },
    });
    const res = (await createMcpHandler(d)(
      request("tools/call", { name: "scan_site", arguments: { urls: ["https://a.test/", "https://a.test/broken"] } })
    )) as any;
    expect(res.result.isError).toBeUndefined();
    expect(res.result.content[0].text).toContain("https://a.test/broken: NOT SCANNED (timed out)");
  });

  it("is an error when there is nothing to scan", async () => {
    const res = (await createMcpHandler(deps())(request("tools/call", { name: "scan_site", arguments: {} }))) as any;
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toContain("Nothing to scan");
  });
});

describe("what the assistant is told", () => {
  it("gives each finding its element, its criterion, its EN clause and its fix, most serious first", () => {
    const text = digestReport(
      report("https://example.com/", 70, [
        finding({ severity: "minor", ruleId: "small" }),
        finding({ severity: "critical", ruleId: "big", elementSnippet: '<a class="cta"   href="/x"></a>' }),
      ])
    );
    expect(text.indexOf("[critical] big")).toBeLessThan(text.indexOf("[minor] small"));
    expect(text).toContain("WCAG 2.4.4 A · EN 301 549 9.2.4.4");
    expect(text).toContain("Element: main > a.cta");
    expect(text).toContain('Markup: <a class="cta" href="/x"></a>');
    expect(text).toContain("Fix: Give it text.");
  });

  it("never lets an empty list read as a conformance claim", () => {
    const text = digestReport(report("https://example.com/", 100, []));
    expect(text).toContain("No accessibility faults were found by the automated checks.");
    expect(text).toContain("do not report this page as conformant");
  });

  it("says when checks did not finish", () => {
    const r = report("https://example.com/", 90, []);
    r.meta.incompleteChecks = ["keyboard walk"];
    expect(digestReport(r)).toContain("Checks that did not finish: keyboard walk");
  });

  it("stops at the limit and says how many findings are left", () => {
    const many = Array.from({ length: 12 }, (_, i) => finding({ selector: `a.n${i}` }));
    const text = digestReport(report("https://example.com/", 20, many), 10);
    expect(text).toContain("…and 2 more findings");
    expect(text).not.toContain("a.n11");
  });

  it("leaves design notes out of the count", () => {
    const text = digestReport(report("https://example.com/", 90, [finding({ category: "design-clarity", ruleId: "typo" })]));
    expect(text).toContain("Findings: 0");
    expect(text).not.toContain("typo");
  });

  it("names the rules that fail on every page of a site", () => {
    const text = digestSite(
      [
        report("https://a.test/", 80, [finding(), finding({ ruleId: "image-alt" })]),
        report("https://a.test/b", 70, [finding()]),
      ],
      []
    );
    expect(text).toContain("On every scanned page");
    expect(text).toMatch(/shared template[^\n]*: link-name\n/);
  });
});
