import { useMemo, useState } from "react";
import { SectionHeader } from "./SectionHeader";
import { DataTable } from "@verify/design-system";
import type { AccessibilityReport, ConformanceSummary } from "../api/scanClient";

// Generates a draft accessibility statement.
//
// Two different EU regimes are in play, and conflating them is how these
// documents end up wrong:
//
//   - Directive (EU) 2016/2102 (the Web Accessibility Directive) covers public
//     sector bodies and prescribes an actual template — the model statement in
//     Commission Implementing Decision (EU) 2018/1523. Its structure is
//     mandatory: compliance status, non-accessible content split into three
//     named categories, preparation (including the assessment method), feedback
//     and contact, enforcement procedure.
//
//   - Directive (EU) 2019/882 (the European Accessibility Act) covers private
//     sector services from 28 June 2025, and does NOT require a statement in
//     that sense. Article 13(2) and Annex V require the provider to explain how
//     the service meets the requirements, in the general terms and conditions
//     or an equivalent document, published in written and oral format and in a
//     form people with disabilities can use.
//
// This draft follows the 2018/1523 model, because it is the only prescribed
// structure and it covers the substance either regime asks for, and then says
// plainly what the EAA additionally expects. Most small businesses have never
// seen one of these — but the scan already holds most of the substance.
//
// The hard rule here is the same as the conformance view: never claim more
// than the evidence supports. A scan cannot establish conformance, so the
// generated text says "partially conformant" and lists known problems rather
// than asserting compliance. A statement that overclaims is worse than none —
// it is a public, dated, written declaration, and under the EAA an inaccurate
// one is its own exposure.

// EN 301 549 defines three positions. "Fully conformant" is deliberately not
// offered: nothing this tool produces can support that claim.
type Position = "partially" | "non";

// Exported for testing. The mandatory structure of this document is set by
// law, so it is checked against that structure rather than trusted to review.
export function buildStatement(opts: {
  organisation: string;
  contactEmail: string;
  siteUrl: string;
  position: Position;
  conformance?: ConformanceSummary;
  knownIssues: string[];
  date: string;
}): string {
  const { organisation, contactEmail, siteUrl, position, conformance, knownIssues, date } = opts;
  const org = organisation.trim() || "[Your organisation]";
  const email = contactEmail.trim() || "[your contact email]";

  const positionSentence =
    position === "partially"
      ? `${org} considers ${siteUrl} to be **partially conformant** with EN 301 549 (which adopts WCAG 2.1 Level AA). "Partially conformant" means some parts of the site do not yet fully conform to the standard.`
      : `${org} considers ${siteUrl} to be **non-conformant** with EN 301 549 (which adopts WCAG 2.1 Level AA). Non-conformant means the site does not yet meet the standard, and we aim to fix this.`;

  // The model statement in Commission Implementing Decision (EU) 2018/1523
  // requires non-accessible content to be split into three named categories,
  // not one list. Only the first is generated from the scan — the other two
  // are declarations only the owner can make, so they are left as prompts
  // rather than quietly omitted. An omitted mandatory heading is the kind of
  // gap that gets a statement rejected.
  const issuesBlock = `## Non-accessible content

The content below is non-accessible for the following reasons.

### Non-compliance

${
  knownIssues.length
    ? `We are aware of the following problems and aim to resolve them:

${knownIssues.map((i) => `- ${i}`).join("\n")}`
    : `An automated check found no failures it is able to detect. That does not mean the site is fully accessible — see "How we assessed this site" below.`
}

### Disproportionate burden

[List here anything you will not fix because it would be a disproportionate burden, and say why. Delete this section if it does not apply.]

*Note: under Article 14 of the European Accessibility Act, to claim disproportionate burden takes more than a mention. You must carry out and document an assessment, keep it for five years, and inform the relevant market surveillance authority.*

### Content outside the scope of the legislation

[List here anything on the site that the accessibility rules do not cover. Examples: third party content you neither fund nor control, archived material, or office file formats published before the relevant date. Where an accessible alternative exists, say so. Delete this section if it does not apply.]`;

  // "Method used to prepare the statement" is a required element of the model
  // (Implementing Decision (EU) 2018/1523, and Art. 3(1) on assessment
  // methods). It distinguishes a self-assessment from a third-party audit, and
  // a statement that does not say which is not complete.
  const assessmentNote = conformance
    ? `**Method used:** self assessment, carried out by the site owner with an automated accessibility checker. It was not a third party evaluation.

This statement is based on an automated check carried out on ${date}. The check covers the ${conformance.total} Level A and AA success criteria in WCAG 2.1.

An automated check has real limits, and we would rather state them than imply a completeness we cannot evidence. ${conformance.needsReview} of those criteria cannot be assessed by software at all. They depend on human judgement. For example: whether video captions are accurate, or whether a form that times out can be extended. Where the check reports no issue, that means no issue was detected. It does not mean a person has verified the criterion as met.

We have not yet carried out a full manual audit or testing with assistive technology users.`
    : `This statement is based on an automated check carried out on ${date}.`;

  return `# Accessibility statement for ${siteUrl}

This statement applies to ${siteUrl}.

## How accessible this website is

${positionSentence}

${issuesBlock}

## How we assessed this site

${assessmentNote}

## Feedback and contact information

If you find an accessibility problem on this site, contact us at ${email}. Contact us too if you need information from the site in a different format. We aim to respond within 10 business days.

## Enforcement procedure

If our response to a complaint does not satisfy you, you can escalate. Take it to the body responsible for enforcement in your country.

[Name the enforcement body that applies to you, and link to its complaints procedure. Each EU member state designates its own. For the European Accessibility Act, these are the market surveillance authorities. For public sector bodies, it is the authority named in your country's transposition of Directive (EU) 2016/2102.]

## Preparation of this statement

This statement was prepared on ${date}. It was last reviewed on ${date}.

We review this statement at least once a year, and whenever the site changes substantially.

## How this information is published

The European Accessibility Act (Article 13(2) and Annex V) asks for more than a page like this one. Two things are worth a check:

- **Where it lives.** Annex V says the assessment belongs in your general terms and conditions, or an equivalent document. That assessment explains how the service meets the accessibility requirements. A published page like this one is a good start; it does not on its own satisfy that.
- **What format it is in.** The information has to be available *in written and oral format*. It must also be in a form people with disabilities can use. In practice that means this page must itself be accessible. There must also be a way to get the same information from a person directly.

Annex V also asks for the following. [Add or link to them here.]

- a general description of the service in accessible formats
- whatever explanation is needed to understand how the service works
- a description of how the service meets the requirements in Annex I

---
*Draft generated from an automated accessibility check. It follows the structure of the model statement in Commission Implementing Decision (EU) 2018/1523. The Web Accessibility Directive prescribes that template for public sector bodies. It is also the closest formal model for everyone else.*

*Complete anything in brackets and have it checked before you publish. Two of the three "non-accessible content" headings above are declarations only you can make. A statement is a public, dated, formal declaration. Under the European Accessibility Act, an inaccurate one is its own exposure.*
`;
}

// Field, then its value on the next line — one column instead of a
// Field/Value pair sitting side by side, which crushed short labels like
// "Website" into a letter-per-line sliver at phone width while the value
// beside it (a URL, a standard name) was the thing that actually needed
// the room. gloss is optional plain-language cover for a value that's
// standards jargon on its own — a standard's name or a conformance
// term, neither of which means anything to the reader without it.
function stmtRow(field: string, value: string, gloss?: string) {
  return (
    <span className="a11y-undecided-cell">
      <span className="a11y-stmt-field-label">{field}</span>
      <span>{value}</span>
      {gloss && <span className="a11y-conf-plain">{gloss}</span>}
    </span>
  );
}

export function AccessibilityStatement({ report }: { report: AccessibilityReport }) {
  const [organisation, setOrganisation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const failing = report.conformance?.failed ?? 0;
  // Below roughly a fifth of criteria failing reads as "partially conformant";
  // beyond that, calling it partial would flatter the site.
  const position: Position = failing > 10 ? "non" : "partially";

  const knownIssues = useMemo(() => {
    // The owner's own list of problems, in plain language, worst first —
    // deduplicated by rule so the statement doesn't repeat one issue per
    // occurrence.
    const seen = new Set<string>();
    const out: string[] = [];
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    for (const f of [...report.findings].sort(
      (a, b) => order[a.severity] - order[b.severity]
    )) {
      if (f.category !== "accessibility") continue;
      const text = f.title ?? f.description;
      const key = f.ruleId ?? text;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text);
      if (out.length >= 12) break;
    }
    return out;
  }, [report.findings]);

  const statement = useMemo(
    () =>
      buildStatement({
        organisation,
        contactEmail,
        siteUrl: report.url,
        position,
        conformance: report.conformance,
        knownIssues,
        // en-GB, not the viewer's locale: house style is European dates
        // (28 June 2025), and that shouldn't change with who's reading.
        date: new Date(report.scannedAt).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }),
    [organisation, contactEmail, report, position, knownIssues]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(statement);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the text is on screen to copy manually.
    }
  }

  return (
    <section className="a11y-section a11y-stmt" aria-labelledby="a11y-stmt-heading">
      <SectionHeader
        eyebrow="European law"
        title="Your accessibility statement"
        id="a11y-stmt-heading"
        navLabel="Accessibility statement"
      />
      <p className="a11y-section-desc">
        European law asks for one if you serve EU customers, and this check already knows most of
        the answers. Add your details and the draft writes itself.
      </p>

      <div className="a11y-stmt-fields">
        <label className="a11y-stmt-field">
          Organisation name
          <input
            type="text"
            autoComplete="organization"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Acme Ltd"
          />
        </label>
        <label className="a11y-stmt-field">
          Contact email for accessibility issues
          <input
            type="email"
            autoComplete="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="access@example.com"
          />
        </label>
      </div>

      {/* The statement's declared facts, as the kit's table — the same
          numbers the prose below commits to, checkable at a glance.
          Field folds above Value in one column rather than sitting beside
          it in a second: a short label ("Website") forced into its own
          column crushed it to a letter-per-line sliver on a phone, while
          Value (a URL, a standard name) needed the room. */}
      <DataTable
        caption="What this statement declares"
        headers={[{ key: "field", label: "What this statement says" }]}
        rows={[
          { id: "org", cells: [stmtRow("Prepared for", organisation.trim() || "[Your organisation]")] },
          { id: "site", cells: [stmtRow("Website", report.url)] },
          {
            id: "std",
            cells: [
              stmtRow(
                "Checked against",
                "EN 301 549 · WCAG 2.1 AA",
                "The EU's technical standard for digital accessibility"
              ),
            ],
          },
          {
            id: "pos",
            cells: [
              stmtRow(
                "Position",
                position === "partially" ? "Partially conformant" : "Non-conformant",
                position === "partially"
                  ? "Meets most requirements, not all of them"
                  : "Doesn't yet meet the standard"
              ),
            ],
          },
          {
            id: "issues",
            cells: [
              stmtRow(
                "Problems disclosed",
                knownIssues.length === 0 ? "None the scan can detect" : String(knownIssues.length)
              ),
            ],
          },
        ]}
      />

      <div className="a11y-stmt-actions">
        <button type="button" className="a11y-sr-play" onClick={copy}>
          {copied ? "Copied" : "Copy the statement"}
        </button>
        {/* The button's own text changing is not reliably announced;
            this mounted status region is. */}
        <span className="a11y-sr-only" role="status">
          {copied ? "Statement copied to the clipboard." : ""}
        </span>
        <span className="a11y-sr-status">
          Says <strong>{position === "partially" ? "partially conformant" : "non-conformant"}</strong>,
          based on {failing} failed {failing === 1 ? "criterion" : "criteria"}.
        </span>
      </div>

      {/* Focusable on purpose. The block scrolls (overflow: auto), and a
          scrollable box that can't be focused is unreachable by keyboard —
          you can see there's more text and have no way to get to it. Giving
          it tabindex="0" puts it in the tab order so arrow keys work, and the
          role plus label mean it's announced as something worth entering
          rather than an unnamed stop. This is WCAG 2.1.1, which the checker
          flags on other people's sites. */}
      <pre
        className="a11y-stmt-text"
        tabIndex={0}
        role="region"
        aria-label="Draft accessibility statement"
      >
        {statement}
      </pre>

      <p className="a11y-conf-caveat">
        <strong>Read it before you publish.</strong> This is a public, dated declaration. The draft
        never claims full compliance, because no automated check can prove it. Make sure it matches
        the testing you have actually done. A starting point, not legal advice.
      </p>
    </section>
  );
}
