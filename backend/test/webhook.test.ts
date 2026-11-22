import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { maskWebhook, sendWebhook, webhookBody, webhookFlavour, type WebhookAlert } from "../src/services/notify/webhook.js";

const alert: WebhookAlert = {
  event: "scan.worse",
  url: "https://shop.test/",
  score: 70,
  previousScore: 80,
  newFindings: 2,
  scanId: "abc",
  findings: [
    { severity: "serious", title: "Buttons without names", description: "d", wcagCriterion: "4.1.2" },
    { severity: "critical", title: "Images without text", description: "d", wcagCriterion: "1.1.1" },
  ],
};

describe("webhook alerts", () => {
  it("knows each service by its host", () => {
    expect(webhookFlavour("https://hooks.slack.com/services/T/B/x")).toBe("slack");
    expect(webhookFlavour("https://discord.com/api/webhooks/1/x")).toBe("discord");
    expect(webhookFlavour("https://prod-01.westeurope.logic.azure.com/workflows/x")).toBe("teams");
    expect(webhookFlavour("https://ci.example.com/hook")).toBe("generic");
  });

  it("gives Slack a sentence and the numbers, Discord content, Teams an Adaptive Card", () => {
    const slack = webhookBody(alert, "slack");
    expect(slack.text).toContain("got worse");
    expect(slack.text).toContain("80 → 70");
    expect(slack.text).toContain("2 new findings");
    expect(slack.score).toBe(70);
    expect(webhookBody(alert, "discord").content).toContain("WCAG 4.1.2");
    const teams = webhookBody(alert, "teams") as { type: string; attachments: Array<{ contentType: string }> };
    expect(teams.type).toBe("message");
    expect(teams.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
  });

  it("never shows the secret part of an address back", () => {
    const masked = maskWebhook("https://hooks.slack.com/services/T000/B000/abcdefSECRETwxyz")!;
    expect(masked).not.toContain("SECRET");
    expect(masked.startsWith("https://hooks.slack.com/")).toBe(true);
  });

  it("signs the exact body, refuses redirects and reports a refusal", async () => {
    let seen: { init?: RequestInit } = {};
    const fetcher = (async (_u: string, init?: RequestInit) => {
      seen = { init };
      return new Response("", { status: 200 });
    }) as typeof fetch;
    const ok = await sendWebhook("https://ci.example.com/hook", alert, "s3cret", fetcher, async () => undefined);
    expect(ok.ok).toBe(true);
    const body = String(seen.init!.body);
    const sig = (seen.init!.headers as Record<string, string>)["x-a11y-signature"];
    expect(sig).toBe(`sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`);
    expect(seen.init!.redirect).toBe("manual");

    const redirected = await sendWebhook(
      "https://ci.example.com/hook",
      alert,
      null,
      (async () => new Response("", { status: 302 })) as typeof fetch,
      async () => undefined
    );
    expect(redirected.ok).toBe(false);
  });

  it("will not post to plain http or a private address", async () => {
    const never = (async () => {
      throw new Error("should not be called");
    }) as typeof fetch;
    expect((await sendWebhook("http://ci.example.com/hook", alert, null, never)).ok).toBe(false);
    expect((await sendWebhook("https://127.0.0.1/hook", alert, null, never)).ok).toBe(false);
  });
});
