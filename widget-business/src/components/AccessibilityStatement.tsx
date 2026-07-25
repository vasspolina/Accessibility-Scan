import { useMemo, useState } from "react";
import type { AccessibilityReport, ConformanceSummary } from "../api/scanClient";

// Generates a draft accessibility statement.
//
// The European Accessibility Act requires covered services to publish one, and
// it has required content: who the provider is, how to reach them, what the
// service's accessibility position actually is, and what isn't covered. Most
// small businesses have never seen one and won't know where to start — but the
// scan already holds most of the substance.
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

function buildStatement(opts: {
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
      : `${org} considers ${siteUrl} to be **non-conformant** with EN 301 549 (which adopts WCAG 2.1 Level AA). Non-conformant means the site does not yet meet the standard, and we are working to address this.`;

  const issuesBlock = knownIssues.length
    ? `## Known accessibility problems

We are aware of the following issues and are working to resolve them:

${knownIssues.map((i) => `- ${i}`).join("\n")}`
    : `## Known accessibility problems

An automated check of this site found no failures it is able to detect. That is not the same as the site being fully accessible — see "How we assessed this site" below.`;

  const assessmentNote = conformance
    ? `This statement is based on an automated check carried out on ${date}, covering the ${conformance.total} Level A and AA success criteria in WCAG 2.1.

An automated check has real limits, and we would rather state them than imply a completeness we cannot evidence. ${conformance.needsReview} of those criteria cannot be assessed by software at all — they depend on human judgement, such as whether video captions are accurate, whether wording is easy enough to understand, or whether a form that times out can be extended. Where the check reports no issue, that means no issue was detected, not that the criterion has been verified as met.

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

If you find an accessibility problem on this site, or need information from it in a different format, please contact us at ${email}. We aim to respond within 10 working days.

## Enforcement procedure

If you contact us with a complaint and are not satisfied with our response, you can escalate it to the accessibility enforcement body in your country. Under the European Accessibility Act, each EU member state designates its own authority.

## Preparation of this statement

This statement was prepared on ${date}. It was last reviewed on ${date}.

---
*Draft generated from an automated accessibility check. Review it, complete anything in brackets, and have it checked before publishing — a published statement is a formal declaration, and it should reflect testing you have actually done.*
`;
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
        date: new Date(report.scannedAt).toLocaleDateString(undefined, {
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
    <section className="a11y-section a11y-stmt">
      <h3 className="a11y-section-title">Your accessibility statement</h3>
      <p className="a11y-section-desc">
        The European Accessibility Act requires businesses serving EU customers to publish one of
        these. Most of it can be filled in from this check. Add your details below and the draft
        updates as you type.
      </p>

      <div className="a11y-stmt-fields">
        <label className="a11y-stmt-field">
          Organisation name
          <input
            type="text"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Acme Ltd"
          />
        </label>
        <label className="a11y-stmt-field">
          Contact email for accessibility issues
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="access@example.com"
          />
        </label>
      </div>

      <div className="a11y-stmt-actions">
        <button type="button" className="a11y-sr-play" onClick={copy}>
          {copied ? "Copied" : "Copy the statement"}
        </button>
        <span className="a11y-sr-status">
          Says <strong>{position === "partially" ? "partially conformant" : "non-conformant"}</strong>,
          based on {failing} failing {failing === 1 ? "criterion" : "criteria"}.
        </span>
      </div>

      <pre className="a11y-stmt-text">{statement}</pre>

      <p className="a11y-conf-caveat">
        <strong>Read this before you publish it.</strong> A statement is a formal, dated, public
        declaration. This draft deliberately never claims full conformance, because an automated
        check cannot establish it — and an overclaiming statement is its own legal exposure under
        the EAA. Check that it matches the testing you have actually done, and get advice if you are
        unsure. This is a starting point, not legal advice.
      </p>
    </section>
  );
}
