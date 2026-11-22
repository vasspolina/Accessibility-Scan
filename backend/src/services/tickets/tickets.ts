import { createHash } from "node:crypto";
import { criterionOf, enClauseOf, fingerprintOf, SEVERITY_ORDER } from "../../cliFormats.js";
import type { AccessibilityFinding, AccessibilityReport, Severity } from "../../types/report.js";

// A report's findings as tickets for the team that fixes them: the text of
// a GitHub issue or a Jira issue, one for each fault on each page.
//
// One ticket per fault, not per element. The report folds forty images
// without alt text into one card, and forty issues saying the same thing
// are how a tracker gets muted. The ticket lists the elements instead
// (selectors, up to MAX_ELEMENTS), which is what the developer needs.
//
// Each ticket carries a key: a hash of the page (origin and path) and the
// rule. It is written into the ticket (a hidden marker in a GitHub body, a
// label in Jira) so a second run finds the open ticket and files nothing new.
// The same fault on two pages is two tickets: it is fixed in two templates as
// often as in one.

export interface TicketDraft {
  key: string;
  title: string;
  body: string;
  labels: string[];
  severity: Severity;
  page: string;
  elements: number;
}

const MAX_ELEMENTS = 20;
const TITLE_MAX = 120;
export const TICKET_LABEL = "accessibility";
export const MARKER_PREFIX = "a11y-scan:ticket";

function pageOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return url;
  }
}

function ruleKey(f: AccessibilityFinding): string {
  return f.ruleId ?? criterionOf(f) ?? (f.title || f.description).slice(0, 80);
}

export function ticketKey(page: string, rule: string): string {
  return createHash("sha256").update(`${page}\n${rule}`).digest("hex").slice(0, 16);
}

/** The marker a GitHub body carries, so a later run can find the ticket. */
export function markerFor(key: string): string {
  return `<!-- ${MARKER_PREFIX} ${key} -->`;
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function fence(code: string): string {
  // A snippet comes from a stranger's page and may hold backticks; a fence
  // one longer than the longest run inside it cannot be closed by it.
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}html\n${code}\n${ticks}`;
}

/** Markdown links and images in page text would render; written as text instead. */
function plain(s: string): string {
  return s.replace(/([\[\]<>])/g, "\\$1");
}

function draftFor(page: string, group: AccessibilityFinding[]): TicketDraft {
  const worst = [...group].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))[0];
  const rule = ruleKey(worst);
  const key = ticketKey(page, rule);
  const criterion = criterionOf(worst);
  const clause = enClauseOf(worst);
  const headline = oneLine(worst.title || worst.description);
  const path = (() => {
    try {
      return new URL(page).pathname;
    } catch {
      return page;
    }
  })();
  const title = `${criterion ? `WCAG ${criterion}: ` : ""}${headline}`.slice(0, TITLE_MAX - path.length - 3) + ` (${path})`;

  const standard = [
    criterion ? `WCAG ${criterion}${worst.wcagLevel ? ` (Level ${worst.wcagLevel})` : ""}` : null,
    clause ? `EN 301 549 ${clause}` : null,
  ].filter(Boolean);

  const lines: string[] = [
    plain(oneLine(worst.title ? `${worst.title}. ${worst.description}` : worst.description)),
    "",
    `- **Page:** ${page}`,
    `- **Severity:** ${worst.severity}`,
    ...(standard.length ? [`- **Standard:** ${standard.join(" · ")}`] : []),
    ...(worst.ruleId ? [`- **Rule:** ${worst.ruleId}`] : []),
    `- **Found by:** ${[...new Set(group.map((f) => f.source))].join(", ")}`,
    "",
    "### What to do",
    "",
    plain(oneLine(worst.suggestedFix || "See the standard named above.")),
    "",
    `### Where (${group.length} element${group.length === 1 ? "" : "s"})`,
    "",
  ];
  for (const f of group.slice(0, MAX_ELEMENTS)) {
    lines.push(`- \`${f.selector.replace(/`/g, "'")}\``);
    if (f.suggestedColour) {
      lines.push(`  - A colour that passes: ${f.suggestedColour.from} → ${f.suggestedColour.to} on ${f.suggestedColour.background} (${f.suggestedColour.ratio.toFixed(2)}:1, needs ${f.suggestedColour.required}:1)`);
    }
  }
  if (group.length > MAX_ELEMENTS) lines.push(`- and ${group.length - MAX_ELEMENTS} more`);
  const snippet = group.find((f) => f.elementSnippet)?.elementSnippet;
  if (snippet) lines.push("", "Example element:", "", fence(snippet.slice(0, 1200)));
  lines.push(
    "",
    "### Check it is fixed",
    "",
    "Scan the page again: the fault is gone when the scan no longer reports it. A person using a keyboard or a screen reader is the final check.",
    "",
    `Fingerprints: ${group.map(fingerprintOf).slice(0, MAX_ELEMENTS).join(", ")}`,
    "",
    markerFor(key)
  );

  return {
    key,
    title,
    body: lines.join("\n"),
    labels: [TICKET_LABEL, `severity:${worst.severity}`, ...(criterion ? [`wcag-${criterion}`] : [])],
    severity: worst.severity,
    page,
    elements: group.length,
  };
}

/**
 * The tickets for one or more reports, worst first. Accessibility findings
 * only: design notes and dark patterns are not failures of a standard, and
 * a finding the owner marked ignored, false positive or fixed is left out.
 */
export function ticketsFor(reports: AccessibilityReport[]): TicketDraft[] {
  const groups = new Map<string, { page: string; findings: AccessibilityFinding[] }>();
  for (const report of reports) {
    const page = pageOf(report.url);
    for (const f of report.findings) {
      if (f.category !== "accessibility") continue;
      if (f.triage && f.triage.state !== "open") continue;
      const id = `${page}\n${ruleKey(f)}`;
      const group = groups.get(id) ?? { page, findings: [] };
      group.findings.push(f);
      groups.set(id, group);
    }
  }
  return [...groups.values()]
    .map((g) => draftFor(g.page, g.findings))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.elements - a.elements);
}

/** The drafts as one Markdown file, for a person to read or paste from. */
export function ticketsMarkdown(drafts: TicketDraft[]): string {
  if (drafts.length === 0) return "No open accessibility findings, so no tickets.\n";
  return drafts.map((d) => `## ${d.title}\n\nLabels: ${d.labels.join(", ")}\n\n${d.body}\n`).join("\n---\n\n");
}
