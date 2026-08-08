import type { AccessibilityReport } from "../api/scanClient";

// The headline for a document, in place of the score.
//
// The 0-to-100 score does not transfer. It is a penalty against 50 web
// criteria, and a handful of findings on a page leaves most of them untouched,
// so 80 means something. A PDF has about six things worth checking, and an
// untagged one is not "80% accessible" — a screen reader cannot read it at all.
// Showing a number there would be precision the check does not have, about a
// document that is unusable.
//
// So documents get a verdict and a count instead, and the verdict leads with
// the failure that decides whether the document can be read at all.

function verdict(report: AccessibilityReport): { line: string; tone: "bad" | "warn" | "good" } {
  const rules = new Set(report.findings.map((f) => f.ruleId));
  if (rules.has("pdf-scanned-image")) {
    return {
      line: "This document is a picture of text. Screen readers get nothing from it at all.",
      tone: "bad",
    };
  }
  if (rules.has("pdf-not-tagged")) {
    return {
      line: "This document has no structure a screen reader can follow. That is the one to fix first.",
      tone: "bad",
    };
  }
  if (report.findings.length > 0) {
    return {
      line: "Readable, with details that would make it easier to use.",
      tone: "warn",
    };
  }
  return {
    line: "Nothing found in the checks we can run automatically.",
    tone: "good",
  };
}

export function DocumentSummary({ report }: { report: AccessibilityReport }) {
  const { line, tone } = verdict(report);
  const pages = report.meta.documentPages;
  const count = report.findings.length;

  return (
    <div className={`a11y-doc-summary a11y-doc-${tone}`}>
      <p className="a11y-doc-verdict">{line}</p>
      <p className="a11y-doc-meta">
        PDF document{pages ? `, ${pages} ${pages === 1 ? "page" : "pages"}` : ""}.{" "}
        {count === 0
          ? "No problems found."
          : `${count} ${count === 1 ? "problem" : "problems"} found.`}{" "}
      </p>
      <p className="a11y-doc-meta">
        We check structure, title, language, readable text and image descriptions. Those decide
        whether a screen reader can read it aloud at all, though not everything a person would check.
      </p>
    </div>
  );
}
