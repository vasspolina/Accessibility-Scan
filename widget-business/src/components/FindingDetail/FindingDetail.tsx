import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * FindingDetail, ported from components/scan/FindingDetail.jsx.
 *
 * The prompt.md is explicit about where this belongs: "Plain-language finding
 * detail, for a DataTable row's `expand` content or a finding page." So this is
 * the row-expansion shape, not a standalone card.
 *
 * Two shapes, and which one you get is decided by the props, exactly as the
 * source decides it — pass any of eyebrow/badge/meta/actionLabel and you get
 * the band: a wrapping metadata header with the action pill at the right, and
 * "what to do" set as display type beneath it. Pass none of them and you get
 * the plain stack: labelled answers at title size.
 *
 * `tone="invert"` puts the band on black. That is safe here for the same reason
 * it is safe in RelatedChecks and unsafe in DataTable: this component owns every
 * child it renders, so nothing a caller supplies lands on the black. The one
 * exception is `badge` — see below.
 *
 * FindingDetail.css is not imported here; see src/styles/components.css.
 */

export interface FindingDetailProps {
  /** Criterion number, e.g. "WCAG 3.2.5". Presence switches on the band. */
  eyebrow?: string;
  /**
   * Severity marker. ReactNode rather than the source's string, deliberately.
   *
   * The source hardcodes --accent-red-fill behind whatever string it is given,
   * which paints a "Moderate" finding the same red as a critical one. This app
   * already has SeverityTag carrying the real ramp (critical/serious/moderate/
   * minor/pass), so the call site passes that and the severity stays truthful.
   * A plain string still works and takes the accent pill, which is the source's
   * behaviour for the one-severity case.
   */
  badge?: ReactNode;
  /** Right-hand context, e.g. "1 place · homepage". */
  meta?: string;
  who?: ReactNode;
  whatFound?: ReactNode;
  whatToDo?: ReactNode;
  affectedLabel?: string;
  affected?: string;
  technicalLabel?: string;
  technical?: ReactNode;
  defaultTechnicalOpen?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "plain" | "invert";
  style?: CSSProperties;
}

export function FindingDetail({
  eyebrow,
  badge,
  meta,
  who,
  whatFound,
  whatToDo,
  affectedLabel = "Affected element",
  affected,
  technicalLabel = "The technical version",
  technical,
  defaultTechnicalOpen = false,
  actionLabel,
  onAction,
  tone = "plain",
  style,
}: FindingDetailProps) {
  const [techOpen, setTechOpen] = useState(defaultTechnicalOpen);
  const [copied, setCopied] = useState(false);

  const inv = tone === "invert";
  const hasHead = Boolean(eyebrow || badge || meta || actionLabel);

  /* One labelled answer. The design stacks the grey label over the answer
     rather than running them inline — an earlier iteration (22:49) had them
     inline and bold, and it was abandoned by 22:57 in favour of this. */
  const row = (label: string, value: ReactNode) => (
    <div className="a11y-fd-row">
      <span className="a11y-fd-row-label">{label}</span>
      <div className="a11y-fd-row-value">{value}</div>
    </div>
  );

  const copy = () => {
    if (!affected) return;
    try {
      void navigator.clipboard?.writeText(affected);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard can be blocked by permissions policy. The selector is on
         screen either way, so a failed copy is not worth an error state. */
    }
  };

  return (
    <div
      className={
        "a11y-fd" +
        (inv ? " a11y-fd-invert" : "") +
        (hasHead ? " a11y-fd-band" : "")
      }
      style={style}
    >
      {hasHead && (
        <div className="a11y-fd-head">
          {(eyebrow || badge) && (
            <div className="a11y-fd-ident">
              {eyebrow && <span className="a11y-fd-eyebrow">{eyebrow}</span>}
              {/* A bare string takes the accent pill, as in the source. A node
                  is rendered as given, which is how SeverityTag gets in. */}
              {typeof badge === "string" ? (
                <span className="a11y-fd-badge">{badge}</span>
              ) : (
                badge
              )}
            </div>
          )}
          {/* In the band, "what we found" is the one-line summary in the header.
              In the plain shape it becomes a labelled answer instead — the
              source branches the same way, and it is why the two shapes read
              so differently despite taking the same props. */}
          {whatFound && <span className="a11y-fd-found">{whatFound}</span>}
          {meta && <span className="a11y-fd-meta">{meta}</span>}
          {actionLabel && (
            <button type="button" className="a11y-fd-action" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}

      {whatToDo && <p className="a11y-fd-todo">{whatToDo}</p>}

      {who && row("Who fixes this", who)}
      {!hasHead && whatFound && row("What we found", whatFound)}

      {affected && (
        <div className="a11y-fd-affected">
          <div className="a11y-fd-affected-head">
            <span className="a11y-fd-affected-label">{affectedLabel}</span>
            <button type="button" className="a11y-fd-copy" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="a11y-fd-affected-value">{affected}</div>
          {/* The source's copy button reports nothing at all. For a product
              whose whole argument is that it practises what it checks, a
              control that changes its own label and says nothing to a screen
              reader is not good enough. */}
          <span className="a11y-sr-only" role="status">
            {copied ? "Copied to clipboard" : ""}
          </span>
        </div>
      )}

      {technical && (
        <div className="a11y-fd-tech">
          <button
            type="button"
            className="a11y-fd-tech-toggle"
            onClick={() => setTechOpen((o) => !o)}
            aria-expanded={techOpen}
          >
            <span aria-hidden="true" className="a11y-fd-tech-caret">
              ▸
            </span>
            {technicalLabel}
          </button>
          {techOpen && <div className="a11y-fd-tech-body">{technical}</div>}
        </div>
      )}
    </div>
  );
}
