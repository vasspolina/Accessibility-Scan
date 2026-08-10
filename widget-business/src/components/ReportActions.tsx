/* The design's "Report actions" panel: the two exports, the run status line,
 * and the "Do this first" callout, grouped on one tinted ground instead of
 * scattered between the form footer, a hidden live region and the score.
 */
import { useId, useState } from "react";
import { ensureHostPrintStyle } from "./PrintButton";
import { emailReport, type EmailReportResult } from "../api/scanClient";
import type { AccessibilityReport } from "../api/scanClient";

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
 */
const RESULT_MESSAGE: Record<EmailReportResult, string> = {
  sent: "Sent. Check your inbox — it may take a minute.",
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
        Report actions
      </h2>

      {/* Each export carries its own note in its own column, so the sentence
          that explains a control sits under that control rather than in one
          run-on paragraph the reader has to split apart themselves. */}
      <div className="a11y-ra-row">
        <form className="a11y-ra-cell a11y-ra-email-form" onSubmit={send}>
          <div className="a11y-ra-item a11y-ra-email">
            <span className="a11y-ra-dot" aria-hidden="true" />
            <label className="a11y-ra-email-label" htmlFor={emailId}>
              Email me this report
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
              placeholder="you@example.com"
              value={address}
              onChange={(ev) => setAddress(ev.target.value)}
              disabled={sending}
            />
            <button type="submit" className="a11y-ra-tag a11y-ra-send" disabled={sending}>
              {sending ? "Sending\u2026" : "Send"}
            </button>
          </div>
          {/* role="status" rather than a bare paragraph: the outcome arrives
              after a wait, so it has to be announced, not just drawn. */}
          <p className="a11y-ra-note" role="status">
            {result
              ? RESULT_MESSAGE[result]
              : "We send it once, to this address. Nothing is stored."}
          </p>
        </form>
        <div className="a11y-ra-cell">
          <button
            type="button"
            className="a11y-ra-item a11y-ra-action a11y-ra-pdf"
            onClick={() => {
              ensureHostPrintStyle();
              window.print();
            }}
          >
            <span className="a11y-ra-label">Save as PDF</span>
            <span className="a11y-ra-tag a11y-ra-tag-pdf">pdf</span>
          </button>
          <p className="a11y-ra-note">
            Opens your browser&rsquo;s print dialog. Choose &ldquo;Save as
            PDF&rdquo; as the destination.
          </p>
        </div>
      </div>

      {/* The run stats, "Do this first" and the jump to the findings all
          moved into the scan-summary panel, which is where the design puts
          them. Saying them twice on one screen is the duplication this
          report keeps having to undo. */}
    </section>
  );
}
