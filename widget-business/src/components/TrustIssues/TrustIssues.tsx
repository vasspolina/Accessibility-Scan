import type { ReactNode } from "react";
import { SeverityTag } from "../SeverityTag";
import type { Severity } from "../SeverityTag";

/**
 * TrustIssues, ported from ui_kits/scan-app/TrustIssues.jsx — the dark-pattern
 * section. Tokens rewritten to v2 per .claude/rules/kit-token-map.md.
 *
 * The screen's argument is in its own words and worth keeping: these findings
 * "don't move the score. They move how much you're trusted." That is why the
 * count sits in the band as display type rather than being folded into the
 * score — it is a separate number measuring a separate thing.
 *
 * The kit renders Tag and Button through a lazy resolver. Tag is not ported, so
 * the fix-kind is a plain span here with the app's own class; Button is, but
 * the caller supplies the action so this component does not decide what
 * opening a finding means.
 *
 * TrustIssues.css is not imported here; see src/styles/components.css.
 */

export interface TrustFinding {
  id: string;
  severity: Severity;
  /** Plain-language severity word, e.g. "Worth fixing". */
  label?: string;
  title: string;
  /** What the fix is — "Content fix", "Code fix". */
  kind?: string;
  what: string;
  where: string;
}

export function TrustIssues({
  eyebrow = "Dark-pattern findings",
  title,
  lead,
  count,
  findings,
  renderAction,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  count: number;
  findings: TrustFinding[];
  /** The per-finding action. Omitted renders no button. */
  renderAction?: (f: TrustFinding) => ReactNode;
}) {
  /* Rendering the band over an empty list would announce a section that has
     nothing to say — and "0" as display type reads as a failure rather than
     the good news it is. */
  if (findings.length === 0) return null;

  return (
    <div className="a11y-trust">
      <section className="a11y-trust-band">
        <div className="a11y-trust-band-inner">
          <div className="a11y-trust-band-heading">
            <span className="a11y-trust-eyebrow">{eyebrow}</span>
            <h2 className="a11y-trust-title">{title}</h2>
          </div>
          <div className="a11y-trust-band-summary">
            {lead && <p className="a11y-trust-lead">{lead}</p>}
            <span className="a11y-trust-count">{count}</span>
          </div>
        </div>
      </section>

      <div className="a11y-trust-list">
        {findings.map((f) => (
          <article key={f.id} className="a11y-trust-row">
            <div className="a11y-trust-row-head">
              <SeverityTag severity={f.severity} label={f.label} />
              <h3 className="a11y-trust-row-title">{f.title}</h3>
              <span className="a11y-trust-where">{f.where}</span>
            </div>
            <p className="a11y-trust-what">{f.what}</p>
            <div className="a11y-trust-row-actions">
              {f.kind && <span className="a11y-trust-kind">{f.kind}</span>}
              {renderAction?.(f)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
