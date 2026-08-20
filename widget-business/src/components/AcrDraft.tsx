import { useId, useMemo, useState } from "react";
import { t } from "../lib/strings";
import type { AccessibilityReport } from "../api/scanClient";
import { buildAcrDraft } from "../lib/buildAcrDraft";

// The procurement document, as far as a scan can honestly take it.
//
// The accessibility statement covers the EU obligation. An Accessibility
// Conformance Report is the thing a buyer asks for — usually a public sector
// body, usually before they will sign anything — and completing one by hand is
// mostly the work of finding the failures. Those are already found.
//
// Collapsed by default. Most people scanning their own site have never been
// asked for one, and it should not take space from the report until it is
// wanted.

export function AcrDraft({ report }: { report: AccessibilityReport }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productVersion, setProductVersion] = useState("");
  const [contact, setContact] = useState("");
  const [copied, setCopied] = useState(false);
  const panelId = useId();

  const draft = useMemo(() => {
    if (!report.conformance) return "";
    return buildAcrDraft({
      productName,
      productVersion,
      contact,
      siteUrl: report.url,
      date: new Date(report.scannedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      conformance: report.conformance,
      findings: report.findings,
    });
  }, [report, productName, productVersion, contact]);

  if (!report.conformance) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the text is on screen to copy by hand.
    }
  }

  return (
    <section className="a11y-section a11y-acr" aria-labelledby="a11y-acr-heading">
      {/* The accordion row and the lead are the section head, wrapped so the
          two-column grid treats them as one item. Grid rows are shared between
          columns, so loose head siblings get pushed below a tall content item
          — 2,200px, in the section where that was measured. */}
      <div className="a11y-section-head">
      <div className="a11y-accordion-row">
        <h2 className="a11y-section-title a11y-accordion-title" id="a11y-acr-heading" data-nav-label={t("Conformance report")}>
          <button
            type="button"
            className="a11y-accordion-head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span>
              Conformance report for buyers{" "}
              <span className="a11y-section-count">VPAT 2.5, draft</span>
            </span>
            <svg
              className="a11y-accordion-chevron"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 11L3 6l.7-.7L8 9.6l4.3-4.3L13 6z" fill="currentColor" />
            </svg>
          </button>
        </h2>
      </div>

      <p className="a11y-section-desc">
        If a public body or a large customer wants to buy from you, they will ask for one of these. It
        is the document a procurement team reads instead of your website.
      </p>
      </div>

      {/* Hidden rather than unrendered, so aria-controls always points at a
          real element. */}
      <div id={panelId} hidden={!open}>
          {/* Five separate warnings, and the last one is the one that
              matters — it was previously the final clause of a six-line
              paragraph, which is where a reader in a hurry stops. */}
          <div className="a11y-conf-caveat">
            <p>
              <strong>This fills in the failures, not the whole form.</strong>
            </p>
            <ul className="a11y-plain-points">
              <li>The template allows four answers: Supports, Partially Supports, Does Not Support, Not Applicable.</li>
              <li>A scan can find failures. It can never establish conformance.</li>
              <li>The draft completes the rows it can evidence and leaves the rest blank on purpose.</li>
              <li>Put &ldquo;Supports&rdquo; in every row and the document looks finished while claiming something nobody checked.</li>
              <li>In a procurement report, that is the version with legal consequences.</li>
            </ul>
          </div>

          {/* What the draft declares, in the same spec-sheet shape the
              accessibility statement uses — the two documents are read by
              the same person for the same reason. */}
          <dl className="a11y-spec-grid" aria-label="What this draft declares">
            <div className="a11y-spec-card a11y-spec-card-lead">
              <dt className="a11y-spec-label">Product</dt>
              <dd className="a11y-spec-value">{productName.trim() || "[Your product]"}</dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">Version</dt>
              <dd className="a11y-spec-value">{productVersion.trim() || "[Version]"}</dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">Checked against</dt>
              <dd className="a11y-spec-value">
                {report.conformance.standard}
                <span className="a11y-spec-gloss">The standard a buyer will ask you about</span>
              </dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">Rows the scan can evidence</dt>
              <dd className="a11y-spec-value">
                {report.conformance.failed}
                <span className="a11y-spec-gloss">
                  of {report.conformance.total}; the rest need a person
                </span>
              </dd>
            </div>
          </dl>

          <div className="a11y-stmt-fields">
            <label className="a11y-stmt-field">
              Product name
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Acme Shop"
              />
            </label>
            <label className="a11y-stmt-field">
              Version
              <input
                type="text"
                value={productVersion}
                onChange={(e) => setProductVersion(e.target.value)}
                placeholder="2026.1"
              />
            </label>
            <label className="a11y-stmt-field">
              Contact for accessibility questions
              <input
                type="email"
                autoComplete="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="access@example.com"
              />
            </label>
          </div>

          <div className="a11y-stmt-actions">
            <button type="button" className="a11y-sr-play" onClick={copy}>
              {copied ? "Copied" : "Copy the draft"}
            </button>
            {/* The button's own text changing is not reliably announced;
                this mounted status region is. */}
            <span className="a11y-sr-only" role="status">
              {copied ? "Draft copied to the clipboard." : ""}
            </span>
          </div>

          <pre
            className="a11y-stmt-text"
            tabIndex={0}
            role="region"
            aria-label="Draft accessibility conformance report"
          >
            {draft}
          </pre>
      </div>
    </section>
  );
}
