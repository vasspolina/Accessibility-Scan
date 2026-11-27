import { createHmac } from "node:crypto";
import { assertSafeUrl } from "../../middleware/ssrfGuard.js";
import { logger } from "../../utils/logger.js";
import type { AccessibilityFinding, AccessibilityReport } from "../../types/report.js";

// Tells a chat channel or any other endpoint that a scheduled scan found the
// site worse, beside (or instead of) the email. Mail can be off on a server
// (no MAIL_API_KEY) and a team usually watches a channel, not an inbox.
//
// One POST per alert, in the shape the receiving service reads:
//
//   Slack, Mattermost, Google Chat   {"text": ...} plus the structured fields
//   Discord                          {"content": ...}
//   Microsoft Teams (Workflows)      a message carrying one Adaptive Card
//   anything else                    the structured fields with "text"
//
// Slack, Mattermost and Google Chat ignore fields they do not know, so they
// get the same structured body as a generic endpoint and a script listening
// on either can read the numbers without parsing the sentence.
//
// A webhook address is a secret: a Slack one is all anyone needs to post
// into that channel. It is never logged (only its host is) and never shown
// back in full (maskWebhook). It goes through the private-address guard when
// the schedule is made AND before every send, because the server makes the
// request: the same confused-deputy reason a scan URL is checked, and DNS can
// change between the two.

export interface WebhookAlert {
  event: "scan.worse" | "test";
  url: string;
  score: number;
  previousScore: number | null;
  newFindings: number;
  scanId?: string;
  findings: Array<Pick<AccessibilityFinding, "severity" | "title" | "description" | "wcagCriterion">>;
}

export type WebhookFlavour = "slack" | "discord" | "teams" | "generic";

// Ten seconds: a chat service answers in well under one, and the scheduler
// runs one thing at a time, so a hung receiver must not hold the next scan.
const SEND_TIMEOUT_MS = 10_000;
const TOP_FINDINGS = 3;

export function webhookFlavour(raw: string): WebhookFlavour {
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return "generic";
  }
  if (host === "hooks.slack.com") return "slack";
  if (host === "discord.com" || host === "discordapp.com") return "discord";
  // Teams' incoming webhooks now run through Power Automate Workflows, whose
  // trigger addresses live on these hosts and read an Adaptive Card.
  if (host.endsWith(".logic.azure.com") || host.endsWith(".powerplatform.com") || host.endsWith(".webhook.office.com")) {
    return "teams";
  }
  return "generic";
}

/** Only https, and only an address that parses. Checked again by assertSafeUrl. */
export function webhookShapeError(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "That webhook address doesn't parse.";
  }
  if (url.protocol !== "https:") return "A webhook address must start with https://.";
  return null;
}

/** The host and a short tail, so the owner can tell their hooks apart without the secret part. */
export function maskWebhook(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}/…${raw.slice(-4)}`;
  } catch {
    return "…";
  }
}

function sentence(alert: WebhookAlert): string {
  if (alert.event === "test") {
    return `Accessible Scan: this webhook works. Alerts for ${alert.url} will arrive here when a scheduled scan finds the site worse.`;
  }
  const parts = [
    alert.previousScore !== null && alert.score < alert.previousScore ? `score ${alert.previousScore} → ${alert.score}` : `score ${alert.score}`,
    alert.newFindings > 0 ? `${alert.newFindings} new finding${alert.newFindings === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return `Accessible Scan: ${alert.url} got worse – ${parts.join(", ")}.`;
}

function findingLine(f: WebhookAlert["findings"][number]): string {
  const what = (f.title || f.description).replace(/\s+/g, " ").trim().slice(0, 140);
  return `${f.severity}${f.wcagCriterion ? ` · WCAG ${f.wcagCriterion}` : ""} – ${what}`;
}

/** The request body for the receiving service. Pure; exported for tests. */
export function webhookBody(alert: WebhookAlert, flavour: WebhookFlavour): Record<string, unknown> {
  const text = sentence(alert);
  const lines = alert.findings.slice(0, TOP_FINDINGS).map(findingLine);
  const long = lines.length ? `${text}\n${lines.map((l) => `• ${l}`).join("\n")}` : text;
  if (flavour === "discord") return { content: long.slice(0, 2000) };
  if (flavour === "teams") {
    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              { type: "TextBlock", text, wrap: true, weight: "Bolder" },
              ...lines.map((l) => ({ type: "TextBlock", text: l, wrap: true, spacing: "Small" })),
            ],
          },
        },
      ],
    };
  }
  return {
    text: long,
    event: alert.event,
    url: alert.url,
    score: alert.score,
    previousScore: alert.previousScore,
    newFindings: alert.newFindings,
    ...(alert.scanId ? { scanId: alert.scanId } : {}),
    findings: alert.findings.slice(0, TOP_FINDINGS),
  };
}

/** The worst accessibility findings first, for the alert's few lines. */
export function alertFromReport(
  report: AccessibilityReport,
  previousScore: number | null,
  newFindings: number,
  scanId?: string,
  newPrints?: Set<string>
): WebhookAlert {
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
  const pool = report.findings.filter(
    (f) => f.category === "accessibility" && (!newPrints || (f.fingerprint && newPrints.has(f.fingerprint)))
  );
  const findings = [...pool]
    .sort((a, b) => order[a.severity] - order[b.severity])
    .map((f) => ({ severity: f.severity, title: f.title, description: f.description, wcagCriterion: f.wcagCriterion }));
  return { event: "scan.worse", url: report.url, score: report.score, previousScore, newFindings, scanId, findings };
}

/**
 * Sends one alert. Never throws: a failed alert is recorded on the run, not
 * a reason to lose the scan. Redirects are refused, since one could point
 * the server at an address the guard would have stopped.
 */
export async function sendWebhook(
  rawUrl: string,
  alert: WebhookAlert,
  secret?: string | null,
  fetcher: typeof fetch = fetch,
  checkUrl: (u: string) => Promise<unknown> = assertSafeUrl
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const shape = webhookShapeError(rawUrl);
  if (shape) return { ok: false, error: shape };
  let host = "";
  try {
    host = new URL(rawUrl).host;
    await checkUrl(rawUrl);
  } catch {
    return { ok: false, error: "That webhook address can't be used." };
  }
  const body = JSON.stringify(webhookBody(alert, webhookFlavour(rawUrl)));
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "A11yCheckerBot/0.1 (+accessibility scan)" };
  // A generic receiver can prove the alert came from this schedule: the
  // HMAC of the exact body under the secret it was given when the schedule
  // was made, in the form GitHub's webhooks use.
  if (secret) headers["x-a11y-signature"] = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    const res = await fetcher(rawUrl, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status };
    logger.info({ webhookHost: host, status: res.status }, "webhook refused the alert");
    return { ok: false, status: res.status, error: `The webhook answered ${res.status}.` };
  } catch (err) {
    logger.info({ webhookHost: host, reason: err instanceof Error ? err.name : "error" }, "webhook send failed");
    return { ok: false, error: "The webhook could not be reached." };
  }
}
