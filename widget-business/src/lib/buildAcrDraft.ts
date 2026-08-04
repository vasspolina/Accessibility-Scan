import type { AccessibilityFinding, ConformanceSummary } from "../api/scanClient";
import { plainForRule } from "./wcagPlain";

// A pre-filled draft of an Accessibility Conformance Report (a completed
// VPAT), for the procurement conversations the EU statement does not cover.
//
// The honest shape of this is decided by the template itself. VPAT 2.5 offers
// exactly four conformance levels — Supports, Partially Supports, Does Not
// Support, Not Applicable — and "Not Evaluated" is not among them. A scan can
// never justify "Supports": no automated tool can establish conformance, only
// find failures. So this does not fill every row.
//
// What it does is the part that actually takes the time. An evaluator
// completing a VPAT spends most of it hunting for the failures; those arrive
// here already found, already worded, already tied to the criterion. The rest
// is left blank, with a header saying plainly that the document is a draft and
// must not be published until a person has finished it.
//
// Filling the blanks with "Supports" would produce a publishable-looking
// document asserting conformance nobody verified. That is the overclaim this
// project refuses everywhere else, and in a procurement document it is the
// version with legal consequences.

export interface AcrOptions {
  productName: string;
  productVersion: string;
  contact: string;
  siteUrl: string;
  date: string;
  conformance: ConformanceSummary;
  findings: AccessibilityFinding[];
}

function criterionRemarks(id: string, findings: AccessibilityFinding[]): string {
  const matching = findings.filter((f) => {
    const m = /(\d\.\d{1,2}\.\d{1,2})/.exec(f.wcagCriterion ?? "");
    return m?.[1] === id && f.category === "accessibility";
  });
  if (matching.length === 0) return "";
  // One line per distinct problem, not per occurrence: an evaluator wants the
  // fault, and the count tells them how widespread it is.
  const byRule = new Map<string, { text: string; count: number }>();
  for (const f of matching) {
    const key = f.ruleId ?? f.description;
    const existing = byRule.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    // Plain language here too. axe's own wording — "Elements must only use
    // supported ARIA attributes" — is written for the developer who will fix
    // it, and this document is read by a procurement team deciding whether to
    // buy. The AI findings already carry their own title.
    const plain = f.ruleId ? plainForRule(f.ruleId)?.plain : undefined;
    byRule.set(key, { text: plain ?? f.title ?? f.description, count: 1 });
  }
  return [...byRule.values()]
    .map((v) => `${v.text}${v.count > 1 ? ` (${v.count} instances)` : ""}`)
    .join(". ");
}

function table(
  level: "A" | "AA",
  conformance: ConformanceSummary,
  findings: AccessibilityFinding[]
): string {
  const rows = conformance.criteria
    .filter((c) => c.level === level)
    .map((c) => {
      const failing = c.status === "failed";
      // Deliberately blank rather than guessed. The four permitted terms have
      // defined meanings and only one of them is evidenced by a scan.
      const conformanceLevel = failing ? "Does Not Support" : "";
      const remarks = failing
        ? criterionRemarks(c.id, findings) || c.failing
        : c.coverage === "manual"
          ? "Not assessed by the automated scan. This criterion cannot be evaluated by software and needs a person."
          : "Automated testing found no failures. That is not evidence of conformance and a person must confirm it.";
      return `| ${c.id} ${c.name} | ${conformanceLevel} | ${remarks} |`;
    });

  return [
    `### Table ${level === "A" ? "1" : "2"}: Success Criteria, Level ${level}`,
    "",
    "| Criteria | Conformance Level | Remarks and Explanations |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

export function buildAcrDraft(opts: AcrOptions): string {
  const { productName, productVersion, contact, siteUrl, date, conformance, findings } = opts;
  const name = productName.trim() || "[Product name]";
  const version = productVersion.trim() || "[Version]";
  const email = contact.trim() || "[contact email]";
  const failedA = conformance.criteria.filter((c) => c.level === "A" && c.status === "failed").length;
  const failedAA = conformance.criteria.filter((c) => c.level === "AA" && c.status === "failed").length;

  return `# Accessibility Conformance Report
## ${name}

**This is an unfinished draft. Do not publish it as it stands.**

An Accessibility Conformance Report is a formal claim relied on by the people
who buy your product. An automated scan produced this draft. A scan can find
failures but can never establish conformance. The scan has filled in every row
it could evidence in the tables below. Every other row is deliberately blank, because the only
honest alternative would be to assert something nobody has checked.

A qualified evaluator needs to complete the blank rows and confirm the ones
filled in here. The evaluator takes responsibility for the result.

**Name of Product/Version:** ${name} ${version}
**Report Date:** ${date}
**Product Description:** Web content at ${siteUrl}
**Contact Information:** ${email}
**Notes:** Draft generated from an automated accessibility scan of a single page (${siteUrl}). Automated testing covers roughly a third of WCAG success criteria. ${conformance.needsReview} of the ${conformance.total} criteria in this report cannot be assessed by software at all.
**Evaluation Methods Used:** Automated testing with axe-core and additional rule based checks, in headless Chromium at 1280x900 and at 390px width. None of manual testing, testing with assistive technology, or testing with people with disabilities was carried out.

## Applicable Standards/Guidelines

| Standard/Guideline | Included In Report |
| --- | --- |
| WCAG 2.1 Level A | Yes |
| WCAG 2.1 Level AA | Yes |
| WCAG 2.1 Level AAA | No |
| EN 301 549 | Chapter 9 (Web) only, via the WCAG tables below |
| Revised Section 508 | Not assessed |

## Terms

VPAT 2.5 defines the terms used in the Conformance Level column:

- **Supports:** the functionality of the product has at least one method that meets the criterion without known defects, or meets it with equivalent facilitation.
- **Partially Supports:** some functionality of the product does not meet the criterion.
- **Does Not Support:** the majority of product functionality does not meet the criterion.
- **Not Applicable:** the criterion is not relevant to the product.

A blank Conformance Level below means the criterion has not been evaluated. It
is not a claim of any kind.

## WCAG 2.1 Report

Summary from the automated scan: ${failedA} Level A and ${failedAA} Level AA criteria have evidenced failures.

${table("A", conformance, findings)}

${table("AA", conformance, findings)}

## What is still missing

- EN 301 549 contains requirements beyond Chapter 9, including documentation and support services. A website may still be subject to them. This report covers none of them.
- Nobody has tested this with real assistive technology or with people with disabilities. That is the part that finds what automated testing cannot.
- Every blank row above needs a human judgement before this document can be used.
`;
}
