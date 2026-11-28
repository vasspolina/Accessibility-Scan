import { useId, useMemo, useRef, useState } from "react";
import { t, tf } from "../lib/strings";
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
  const firstField = useRef<HTMLInputElement>(null);

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
      // The human half. Without these every non-failing row's Conformance
      // Level stays blank, because a scan can never justify "Supports".
      verdicts: report.verdicts,
    });
  }, [report, productName, productVersion, contact]);

  if (!report.conformance) return null;

  // One sentence around the evidenced-row count, split on its placeholder so
  // the count keeps its own styling.
  const [rowsBefore, rowsAfter] = tf("{failed} of {total}; the rest need a person", {
    total: report.conformance.total,
  }).split("{failed}");

  // The draft as a file to send on. Markdown, because the draft is written
  // in it: its tables open as tables in most editors and convert to Word.
  function download() {
    const host = (() => {
      try {
        return new URL(report.url).hostname.replace(/^www\./, "");
      } catch {
        return "site";
      }
    })();
    const url = URL.createObjectURL(new Blob([draft], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `conformance-report-${host}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
            {/* A solid triangle at the start of the line, pointing right
                shut and down open (user's instruction, 22 Nov 2026), in place of the chevron in a
                round at the far end. Drawn, so it fills with currentColor
                in forced colours too. */}
            <svg className="a11y-acr-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
              <path d="M2.5 1 11 6 2.5 11z" fill="currentColor" />
            </svg>
            <span>
              {t("Conformance report for buyers")}{" "}
              <span className="a11y-section-count">{t("VPAT 2.5, draft")}</span>
            </span>
          </button>
        </h2>
      </div>

      <p className="a11y-section-desc">
        {t("Public bodies and large customers ask for one before they buy.")}
      </p>
      {/* The way in that reads as one (user's instruction, 17 Nov 2026). The
          title above was the only toggle, and nothing about it said it would
          make anything. Opens the draft and puts the cursor in its first
          field, the one thing the reader has to type. Gone once open: the
          title still closes it. */}
      {!open && (
        <button
          type="button"
          className="a11y-btn a11y-btn-primary a11y-acr-make"
          aria-controls={panelId}
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => firstField.current?.focus());
          }}
        >
          {t("Make a conformance report")}
        </button>
      )}
      </div>

      {/* Hidden rather than unrendered, so aria-controls always points at a
          real element. */}
      <div id={panelId} hidden={!open}>
          {/* Five separate warnings, and the last one is the one that
              matters — it was previously the final clause of a six-line
              paragraph, which is where a reader in a hurry stops. */}
          <div className="a11y-conf-caveat">
            <p>
              <strong>{t("This draft fills in the failures. The rest of the form is left for you.")}</strong>
            </p>
            <ul className="a11y-plain-points">
              <li>{t("The template allows four answers: Supports, Partially Supports, Does Not Support, Not Applicable.")}</li>
              <li>{t("A scan can find failures. It can never establish conformance.")}</li>
              <li>{t("Put “Supports” in every row and the document looks finished while claiming something nobody checked.")}</li>
              <li>{t("In a procurement report, that is the version with legal consequences.")}</li>
            </ul>
          </div>

          {/* One panel, as the accessibility statement's form (user's
              instruction, 25 Nov 2026, "design this like the other forms"):
              the title, the three fields on top and the facts they feed
              under a rule, so what you type and where it lands read as one
              thing. No submit: the facts and the draft follow the fields as
              they are typed. */}
          <div className="a11y-stmt-form">
          <div className="a11y-stmt-step">
            <h3 className="a11y-stmt-step-head">{t("Tell us about the product")}</h3>
          </div>

          <div className="a11y-stmt-fields">
            <label className="a11y-stmt-field">
              {t("Product name")}
              <input
                ref={firstField}
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Acme Shop"
              />
            </label>
            <label className="a11y-stmt-field">
              {t("Version")}
              <input
                type="text"
                value={productVersion}
                onChange={(e) => setProductVersion(e.target.value)}
                placeholder="2026.1"
              />
            </label>
            <label className="a11y-stmt-field">
              {t("Contact for accessibility questions")}
              <input
                type="email"
                autoComplete="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="access@example.com"
              />
            </label>
          </div>

          {/* What the draft declares, in the same spec-sheet shape the
              accessibility statement uses — the two documents are read by
              the same person for the same reason. */}
          <dl className="a11y-spec-grid" aria-label={t("What this draft declares")}>
            <div className="a11y-spec-card a11y-spec-card-lead">
              <dt className="a11y-spec-label">{t("Product")}</dt>
              <dd className="a11y-spec-value">{productName.trim() || t("[Your product]")}</dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">{t("Version")}</dt>
              <dd className="a11y-spec-value">{productVersion.trim() || t("[Version]")}</dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">{t("Checked against")}</dt>
              <dd className="a11y-spec-value">
                {report.conformance.standard}
                <span className="a11y-spec-gloss">{t("The standard a buyer will ask you about")}</span>
              </dd>
            </div>
            <div className="a11y-spec-card">
              <dt className="a11y-spec-label">{t("Rows the scan can evidence")}</dt>
              <dd className="a11y-spec-value">
                {rowsBefore}
                {report.conformance.failed}
                <span className="a11y-spec-gloss">{(rowsAfter ?? "").trim()}</span>
              </dd>
            </div>
          </dl>
          </div>

          <div className="a11y-stmt-actions">
            <button type="button" className="a11y-sr-play" onClick={copy}>
              {copied ? t("Copied") : t("Copy the draft")}
            </button>
            <button type="button" className="a11y-sr-play" onClick={download}>
              {t("Download the report")}
            </button>
            {/* The button's own text changing is not reliably announced;
                this mounted status region is. */}
            <span className="a11y-sr-only" role="status">
              {copied ? t("Draft copied to the clipboard.") : ""}
            </span>
          </div>

          <pre
            className="a11y-stmt-text"
            tabIndex={0}
            role="region"
            aria-label={t("Draft accessibility conformance report")}
          >
            {draft}
          </pre>
      </div>
    </section>
  );
}
