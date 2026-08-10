import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { AccessibilityReport } from "../../types/report.js";

/**
 * Emailing a report.
 *
 * The one rule that shapes everything here: the body is rendered on the
 * server from the validated report, and NOTHING the caller writes is ever
 * placed in the message. An endpoint that mails caller-supplied text to a
 * caller-supplied address is a spam relay wearing this domain's sending
 * reputation, and reputation lost that way is slow and expensive to get
 * back. The caller chooses a recipient and supplies a report that had to
 * pass accessibilityReportSchema; it chooses no words.
 *
 * This renderer necessarily says the same things as the widget's
 * buildPlainSummary without being character-identical to it. That is a
 * knowing duplication: sharing the code would mean either shipping the
 * widget's renderer to the server or trusting text the client sent, and the
 * second is the thing this file exists to refuse.
 */

const SEVERITY_LABEL = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
} as const;

const SEVERITY_ORDER = ["critical", "serious", "moderate", "minor"] as const;

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rejected" | "failed" };

function renderText(report: AccessibilityReport): string {
  const scannedAt = new Date(report.scannedAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* One fault, one line: findings are grouped by rule, so a page with the
     same fault in 14 places reads as one entry with a count. The report's
     own rule, and the difference between a list you can act on and a wall. */
  const groups = new Map<string, { title: string; severity: string; count: number }>();
  for (const f of report.findings) {
    /* ruleId is optional in the schema; a finding without one is its own
       group rather than being merged with every other unruled finding. */
    const key = f.ruleId ?? f.id;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else
      groups.set(key, {
        title: f.title || f.description,
        severity: f.severity,
        count: 1,
      });
  }
  const ordered = [...groups.values()].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity as (typeof SEVERITY_ORDER)[number]) -
      SEVERITY_ORDER.indexOf(b.severity as (typeof SEVERITY_ORDER)[number])
  );

  const lines = [
    `Accessibility scan: ${report.url}`,
    `Scanned ${scannedAt}`,
    "",
    `Score: ${report.score}/100`,
    "",
  ];

  if (ordered.length === 0) {
    lines.push("Nothing found that needs a fix.");
  } else {
    lines.push("Issues found, most severe first:");
    for (const g of ordered) {
      const label = SEVERITY_LABEL[g.severity as keyof typeof SEVERITY_LABEL] ?? g.severity;
      lines.push(`- [${label}] ${g.title}${g.count > 1 ? ` (${g.count}x)` : ""}`);
    }
  }

  lines.push(
    "",
    "What this score is, and is not:",
    "- It counts what an automated scan can prove, weighted by how much each problem costs a visitor.",
    "- A scan of this kind reaches somewhere between a third and a half of accessibility problems.",
    "- The rest need a person with a keyboard and a screen reader.",
    "- It is not a statement that the site meets the law.",
    "",
    "You asked for this report from the accessibility scanner on this page."
  );
  return lines.join("\n");
}

export async function sendReportEmail(
  to: string,
  report: AccessibilityReport
): Promise<SendResult> {
  if (!env.MAIL_API_KEY || !env.MAIL_FROM) return { ok: false, reason: "not_configured" };

  const body = {
    from: env.MAIL_FROM,
    to: [to],
    subject: `Accessibility scan: ${report.url} — ${report.score}/100`,
    text: renderText(report),
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true };
    /* 4xx is our fault or the address's — a wrong key, an unverified
       MAIL_FROM domain, a mailbox the provider will not accept. Logged
       without the key and without the recipient: an address someone typed
       into a scanner is not ours to keep in a log. */
    const status = res.status;
    logger.warn({ status }, "Mail provider rejected the report email");
    return { ok: false, reason: status >= 400 && status < 500 ? "rejected" : "failed" };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Mail provider request failed");
    return { ok: false, reason: "failed" };
  }
}
