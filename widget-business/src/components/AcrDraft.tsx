import { useId, useMemo, useState } from "react";
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
    <section className="a11y-section a11y-acr">
      <div className="a11y-accordion-row">
        <h2 className="a11y-section-title a11y-accordion-title">
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
        If a public body or a large customer is buying from you, they will ask for one of these. It
        is the document a procurement team reads instead of your website.
      </p>

      {open && (
        <div id={panelId}>
          <p className="a11y-conf-caveat">
            <strong>This fills in the failures, not the whole form.</strong> The template allows four
            answers: Supports, Partially Supports, Does Not Support, Not Applicable. A scan can find
            failures but can never establish conformance, so the rows it can evidence are completed
            and the rest are left blank on purpose. Filling them with "Supports" would produce a
            document that looks finished and claims something nobody checked, which in a procurement
            report is the version with legal consequences.
          </p>

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
      )}
    </section>
  );
}
