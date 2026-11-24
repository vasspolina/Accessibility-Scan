/* The design's "Report actions" panel: the two exports, the run status line,
 * and the "Do this first" callout, grouped on one tinted ground instead of
 * scattered between the form footer, a hidden live region and the score.
 */
import { useId, useState } from "react";
import { ensureHostPrintStyle } from "./PrintButton";
import { emailReport, type EmailReportResult } from "../api/scanClient";
import { t } from "../lib/strings";
import type { AccessibilityReport } from "../api/scanClient";
import { Icon } from "./Icon";

/* Sending the report.
 *
 * The visitor types an address and the service sends it there. The report
 * travels with the request — nothing is stored server-side yet, so there is
 * no id to send instead — and the server renders the message from it after
 * validation, never from anything written here.
 *
 * This replaces a mailto: link, which was the honest thing to build before
 * there was a provider but did not do what its own label said: "Email me
 * this report" opened the visitor's composer with an empty To field and
 * nothing sent, and on a machine with no mail client registered it did
 * nothing at all, silently.
 *
 * Every outcome is a sentence, because they are genuinely different things
 * to be told: the scanner has no mail set up, the address was refused, the
 * provider failed. "Something went wrong" would collapse all three.
 *
 * The values are the English keys; t() turns them into the reader's language
 * at render time, so a language switch reaches them too.
 */
const RESULT_MESSAGE: Record<EmailReportResult, string> = {
  sent: "Sent. Check your inbox. It may take a minute.",
  not_configured: "Email isn't set up on this scanner yet. Save as PDF instead.",
  rejected: "That address was refused. Check it and try again.",
  failed: "The report couldn't be sent just now. Please try again shortly.",
};

export function ReportActions({
  report,
  apiBase,
}: {
  /* The whole report, because that is what gets sent. */
  report: AccessibilityReport;
  apiBase: string;
}) {
  const emailId = useId();
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<EmailReportResult | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setResult(null);
    setResult(await emailReport(apiBase, address.trim(), report));
    setSending(false);
  }

  return (
    <section className="a11y-report-actions" aria-labelledby="a11y-ra-heading">
      <h2 className="a11y-sr-only" id="a11y-ra-heading">
        {t("Report actions")}
      </h2>

      {/* One rounded panel (user's reference, 24 Nov 2026, "design this
          like this, delete descriptions"): the title centred over the
          address field, the send a black pill under it, Download in PDF a
          small pill at the foot. The notes that sat under the two controls
          are gone; the status line stays for the outcome of a send. */}
      <div className="a11y-ra-panel">
        <form className="a11y-ra-email-form" onSubmit={send}>
          <h3 className="a11y-ra-head">{t("Email me this report")}</h3>
          <div className="a11y-ra-field">
            <label className="a11y-ra-field-label" htmlFor={emailId}>
              {t("Your email address")}
            </label>
            <input
              id={emailId}
              className="a11y-ra-email-input"
              type="email"
              /* The browser's own suggestion list is the fastest correct way
                 for someone to enter their own address, and typos here cost
                 the whole feature. */
              autoComplete="email"
              inputMode="email"
              required
              placeholder={t("you@example.com")}
              value={address}
              onChange={(ev) => setAddress(ev.target.value)}
              disabled={sending}
            />
          </div>
          {/* Both wordings sit in one grid cell and only the current one is
              shown, so the pill keeps its width while it sends. The hidden
              one is visibility: hidden, so it is not part of the name. */}
          <button type="submit" className="a11y-ra-send" disabled={sending}>
            <Icon name="email" className="a11y-ra-send-icon" />
            <span className="a11y-ra-send-words">
              <span className="a11y-ra-send-word" data-off={sending ? "" : undefined}>
                {t("Send this report")}
              </span>
              <span className="a11y-ra-send-word" data-off={sending ? undefined : ""}>
                {t("Sending\u2026")}
              </span>
            </span>
          </button>
          {/* role="status" rather than a bare paragraph: the outcome arrives
              after a wait, so it has to be announced, not just drawn. It is
              empty until then and stays in the document, so the
              announcement is not lost. */}
          <p className="a11y-ra-note" role="status">
            {result ? t(RESULT_MESSAGE[result]) : null}
          </p>
        </form>
        {/* The icon set's download, not a glyph. */}
        <button
          type="button"
          className="a11y-ra-pdf"
          onClick={() => {
            ensureHostPrintStyle();
            window.print();
          }}
        >
          {t("Download in PDF")}
          <Icon name="download" className="a11y-ra-pdf-icon" />
        </button>
      </div>

      {/* The run stats, "Do this first" and the jump to the findings all
          moved into the scan-summary panel, which is where the design puts
          them. Saying them twice on one screen is the duplication this
          report keeps having to undo. */}
    </section>
  );
}
