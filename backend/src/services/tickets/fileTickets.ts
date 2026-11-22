import { redact } from "../auth/authenticate.js";
import { logger } from "../../utils/logger.js";
import { MARKER_PREFIX, TICKET_LABEL, type TicketDraft } from "./tickets.js";

// Files ticket drafts (tickets.ts) in GitHub Issues or Jira Cloud.
//
// The token is the caller's, sent with the request and used for it only:
// never stored, never logged, never echoed. Every error that leaves this file
// goes through redact(), because an HTTP library's message can quote the
// header it sent.
//
// Where the request goes is fixed, never the caller's to name: api.github.com
// for GitHub, and the caller's own *.atlassian.net site for Jira. A free
// address would let a stranger point this server, carrying a token, at
// anywhere, including the private ranges the scan guard refuses.
//
// Before filing, each tracker is asked which tickets are already open (by the
// marker or label tickets.ts writes), so running it twice files nothing twice.

export interface FiledTicket {
  key: string;
  title: string;
  status: "created" | "exists" | "failed";
  url?: string;
  error?: string;
}

export interface GithubTarget {
  kind: "github";
  repo: string; // owner/name
  token: string;
}

export interface JiraTarget {
  kind: "jira";
  site: string; // https://your-team.atlassian.net
  email: string;
  token: string;
  projectKey: string;
  issueType?: string;
}

export type TicketTarget = GithubTarget | JiraTarget;

// A cap per request: a first scan of a large page can hold sixty faults,
// and sixty issues in one go is a flood nobody triages. The worst come first
// (ticketsFor sorts them), so the cap keeps the ones that matter.
export const MAX_TICKETS_PER_REQUEST = 25;
const REQUEST_TIMEOUT_MS = 15_000;

export const REPO_PATTERN = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
export const JIRA_SITE_PATTERN = /^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.atlassian\.net\/?$/i;
export const JIRA_PROJECT_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;

export function targetError(target: TicketTarget): string | null {
  if (target.kind === "github") {
    return REPO_PATTERN.test(target.repo) ? null : "The repository must be written owner/name.";
  }
  if (!JIRA_SITE_PATTERN.test(target.site)) return "The Jira site must be your https://…atlassian.net address.";
  if (!JIRA_PROJECT_PATTERN.test(target.projectKey)) return "The Jira project key is the capitals before an issue's number, such as WEB.";
  return null;
}

type Fetcher = typeof fetch;

async function call(fetcher: Fetcher, url: string, init: RequestInit): Promise<Response> {
  return fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function failure(err: unknown, secrets: string[]): string {
  return redact(err instanceof Error ? err.message : String(err), secrets);
}

async function statusError(res: Response, what: string): Promise<string> {
  if (res.status === 401) return `${what} refused the token.`;
  if (res.status === 403) return `${what} would not let this token do that (403). It needs permission to create issues.`;
  if (res.status === 404) return `${what} found no such project, or the token cannot see it.`;
  if (res.status === 410) return `Issues are turned off for that repository.`;
  return `${what} answered ${res.status}.`;
}

// ---------- GitHub ----------

function githubHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
    "user-agent": "a11y-scan",
  };
}

/** The keys of the scanner's tickets already open in the repository. */
async function openGithubKeys(target: GithubTarget, fetcher: Fetcher): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const marker = new RegExp(`${MARKER_PREFIX} ([0-9a-f]{16})`);
  // Up to five pages of a hundred: past five hundred open accessibility
  // issues the repository's problem is not duplicates.
  for (let page = 1; page <= 5; page++) {
    const res = await call(
      fetcher,
      `https://api.github.com/repos/${target.repo}/issues?state=open&labels=${TICKET_LABEL}&per_page=100&page=${page}`,
      { headers: githubHeaders(target.token) }
    );
    if (!res.ok) throw new Error(await statusError(res, "GitHub"));
    const issues = (await res.json()) as Array<{ body?: string | null; html_url: string; pull_request?: unknown }>;
    for (const issue of issues) {
      if (issue.pull_request) continue;
      const m = issue.body?.match(marker);
      if (m) found.set(m[1], issue.html_url);
    }
    if (issues.length < 100) break;
  }
  return found;
}

export async function fileInGithub(target: GithubTarget, drafts: TicketDraft[], fetcher: Fetcher = fetch): Promise<FiledTicket[]> {
  const secrets = [target.token];
  let open: Map<string, string>;
  try {
    open = await openGithubKeys(target, fetcher);
  } catch (err) {
    const message = failure(err, secrets);
    logger.info({ repo: target.repo, reason: message }, "github tickets: could not list open issues");
    return drafts.map((d) => ({ key: d.key, title: d.title, status: "failed", error: message }));
  }
  const out: FiledTicket[] = [];
  for (const d of drafts.slice(0, MAX_TICKETS_PER_REQUEST)) {
    const existing = open.get(d.key);
    if (existing) {
      out.push({ key: d.key, title: d.title, status: "exists", url: existing });
      continue;
    }
    try {
      const res = await call(fetcher, `https://api.github.com/repos/${target.repo}/issues`, {
        method: "POST",
        headers: githubHeaders(target.token),
        body: JSON.stringify({ title: d.title, body: d.body, labels: d.labels }),
      });
      if (!res.ok) {
        out.push({ key: d.key, title: d.title, status: "failed", error: await statusError(res, "GitHub") });
        // A refused token or a missing repository fails every ticket the
        // same way; stop instead of making the same refused call 25 times.
        if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) break;
        continue;
      }
      const made = (await res.json()) as { html_url: string };
      out.push({ key: d.key, title: d.title, status: "created", url: made.html_url });
    } catch (err) {
      out.push({ key: d.key, title: d.title, status: "failed", error: failure(err, secrets) });
    }
  }
  return out;
}

// ---------- Jira Cloud ----------

const jiraLabel = (key: string) => `a11y-${key}`;

function jiraHeaders(target: JiraTarget): Record<string, string> {
  return {
    authorization: `Basic ${Buffer.from(`${target.email}:${target.token}`).toString("base64")}`,
    accept: "application/json",
    "content-type": "application/json",
    "user-agent": "a11y-scan",
  };
}

/** Jira's v2 API takes wiki markup; the Markdown body is close enough once headings and code are converted. */
export function markdownToJira(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^### (.*)$/gm, "h3. $1")
    .replace(/^## (.*)$/gm, "h2. $1")
    .replace(/^`{3,}\w*\n([\s\S]*?)\n`{3,}$/gm, "{code}\n$1\n{code}")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/`([^`\n]+)`/g, "{{$1}}")
    .replace(/^ {2}- /gm, "** ")
    .replace(/^- /gm, "* ")
    .replace(/\\([\[\]<>])/g, "$1")
    .trim();
}

export async function fileInJira(target: JiraTarget, drafts: TicketDraft[], fetcher: Fetcher = fetch): Promise<FiledTicket[]> {
  const secrets = [target.token, target.email];
  const site = target.site.replace(/\/+$/, "");
  const out: FiledTicket[] = [];
  for (const d of drafts.slice(0, MAX_TICKETS_PER_REQUEST)) {
    try {
      const jql = `project = "${target.projectKey}" AND labels = "${jiraLabel(d.key)}" AND statusCategory != Done`;
      // search/jql: Atlassian retired the older /rest/api/2/search for Cloud.
      const search = await call(fetcher, `${site}/rest/api/3/search/jql?maxResults=1&fields=key&jql=${encodeURIComponent(jql)}`, {
        headers: jiraHeaders(target),
      });
      if (!search.ok) {
        out.push({ key: d.key, title: d.title, status: "failed", error: await statusError(search, "Jira") });
        if (search.status === 401 || search.status === 403) break;
        continue;
      }
      const found = (await search.json()) as { issues?: Array<{ key: string }> };
      if (found.issues?.length) {
        out.push({ key: d.key, title: d.title, status: "exists", url: `${site}/browse/${found.issues[0].key}` });
        continue;
      }
      const res = await call(fetcher, `${site}/rest/api/2/issue`, {
        method: "POST",
        headers: jiraHeaders(target),
        body: JSON.stringify({
          fields: {
            project: { key: target.projectKey },
            issuetype: { name: target.issueType || "Bug" },
            summary: d.title.slice(0, 250),
            description: markdownToJira(d.body),
            // Jira labels cannot hold a space or a colon.
            labels: [...d.labels.map((l) => l.replace(/[\s:]+/g, "-")), jiraLabel(d.key)],
          },
        }),
      });
      if (!res.ok) {
        out.push({ key: d.key, title: d.title, status: "failed", error: await statusError(res, "Jira") });
        if (res.status === 401 || res.status === 403 || res.status === 404) break;
        continue;
      }
      const made = (await res.json()) as { key: string };
      out.push({ key: d.key, title: d.title, status: "created", url: `${site}/browse/${made.key}` });
    } catch (err) {
      out.push({ key: d.key, title: d.title, status: "failed", error: failure(err, secrets) });
    }
  }
  return out;
}

export function fileTickets(target: TicketTarget, drafts: TicketDraft[], fetcher: Fetcher = fetch): Promise<FiledTicket[]> {
  return target.kind === "github" ? fileInGithub(target, drafts, fetcher) : fileInJira(target, drafts, fetcher);
}
