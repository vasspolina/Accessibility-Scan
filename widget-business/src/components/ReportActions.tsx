/* The design's "Report actions" panel: the two exports, the run status line,
 * and the "Do this first" callout, grouped on one tinted ground instead of
 * scattered between the form footer, a hidden live region and the score.
 */
import { buildPlainSummary, computeDoFirst } from "./ScoreGauge";
import { ensureHostPrintStyle } from "./PrintButton";
import type { AccessibilityFinding } from "../api/scanClient";

/* Email, without a mail server.
 *
 * The design shows "email me this report" as a filled control, which reads as
 * "type an address, we send it." This widget cannot do that: the backend has
 * no mail provider and no job queue to hand a send off to, and the report
 * itself promises the scan is kept in this browser — posting it to a mail
 * service to be delivered would break that promise, not just add a feature.
 *
 * A mailto: hands the report to the visitor's own mail client, already
 * written, addressed to whoever they choose. Nothing is transmitted by us,
 * so the promise holds, and the control does what its label says today
 * rather than after a provider is bought and keys are set.
 *
 * The body is buildPlainSummary — the same text the copy button puts on the
 * clipboard, so the mailed report and the pasted one can never disagree.
 * Long reports are the known limit: mail clients cut the URL somewhere past
 * a couple of thousand characters, so the summary is trimmed with a pointer
 * back rather than silently truncated mid-finding.
 */
const BODY_LIMIT = 1800;

function mailtoHref(summary: string, url: string): string {
  let body = summary;
  if (body.length > BODY_LIMIT) {
    const cut = body.lastIndexOf("\n", BODY_LIMIT);
    body =
      body.slice(0, cut > 0 ? cut : BODY_LIMIT) +
      `\n\n(Trimmed to fit an email. The full report is on the scan page for ${url}.)`;
  }
  return `mailto:?subject=${encodeURIComponent(
    `Accessibility scan: ${url}`
  )}&body=${encodeURIComponent(body)}`;
}

export function ReportActions({
  url,
  seed,
  score,
  total,
  tookSeconds,
  allFindings,
  findings,
  onSeeFindings,
}: {
  url: string;
  seed: string;
  score: number;
  total: number;
  tookSeconds: number | null;
  allFindings: AccessibilityFinding[];
  findings: AccessibilityFinding[];
  onSeeFindings: () => void;
}) {
  const doFirst = computeDoFirst(findings);
  const summary = buildPlainSummary({ url, seed, score, allFindings });

  return (
    <section className="a11y-report-actions" aria-labelledby="a11y-ra-heading">
      <h2 className="a11y-sr-only" id="a11y-ra-heading">
        Report actions
      </h2>

      {/* Each export carries its own note in its own column, so the sentence
          that explains a control sits under that control rather than in one
          run-on paragraph the reader has to split apart themselves. */}
      <div className="a11y-ra-row">
        <div className="a11y-ra-cell">
          {/* An anchor, not a button: it navigates to a mail client, and
              middle-click/⌘-click should behave the way they do on a link. */}
          <a
            className="a11y-ra-item a11y-ra-action a11y-ra-email"
            href={mailtoHref(summary, url)}
          >
            <span className="a11y-ra-dot" aria-hidden="true" />
            <span className="a11y-ra-label">Email me this report</span>
            <span className="a11y-ra-tag a11y-ra-tag-email">email</span>
          </a>
          <p className="a11y-ra-note">
            Opens your own mail app with the report already written. Nothing is
            sent by us.
          </p>
        </div>
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

      <div className="a11y-ra-row">
        <p className="a11y-ra-item a11y-ra-stat">
          <span className="a11y-ra-label">Check complete</span>
          <span className="a11y-ra-tag a11y-ra-tag-time">
            {tookSeconds ?? 0} sec
          </span>
        </p>
        <p className="a11y-ra-item a11y-ra-stat">
          <span className="a11y-ra-label">Score {score} out of 100</span>
          <span className="a11y-ra-tag a11y-ra-tag-issues">
            {total} {total === 1 ? "issue" : "issues"}
          </span>
        </p>
      </div>

      {doFirst && (
        <div className="a11y-ra-item a11y-ra-dofirst">
          <div className="a11y-ra-dofirst-text">
            <p className="a11y-ra-dofirst-title">{doFirst.title.toLowerCase()}</p>
            <p className="a11y-ra-dofirst-statement">
              Fixing it settles {doFirst.settles} of the {doFirst.outOf} most
              serious findings at once.
            </p>
          </div>
          <span className="a11y-ra-tag a11y-ra-tag-first">Do this first</span>
        </div>
      )}

      {doFirst && (
        <div className="a11y-ra-foot">
          <button
            type="button"
            className="a11y-btn a11y-btn-primary a11y-ra-jump"
            onClick={onSeeFindings}
          >
            See the {doFirst.settles} findings
          </button>
        </div>
      )}
    </section>
  );
}
