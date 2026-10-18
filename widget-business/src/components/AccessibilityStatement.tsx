import { useMemo, useState } from "react";
import { SectionHeader } from "./SectionHeader";
import { t, tf } from "../lib/strings";
import { getLang, type Lang } from "../lib/i18n";
import type { AccessibilityReport, ConformanceSummary, RecordedVerdict } from "../api/scanClient";
import { renderReply } from "./ScanChat";

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

/**
 * The manual half of the method paragraph, as far as the verdicts on file
 * take it. Counts, never names: a statement is public and the person who
 * decided is not part of the declaration — the ACR carries that.
 */
function manualNote(needsReview: number, verdicts: RecordedVerdict[]): string {
  const decided = verdicts.filter((v) => v.status !== "unresolved");
  if (decided.length === 0) {
    return t("We have not yet carried out a full manual audit or testing with assistive technology users.");
  }
  const n = (s: RecordedVerdict["status"]) => decided.filter((v) => v.status === s).length;
  // Each list item is a whole phrase, one key per number form; the list
  // itself is joined with commas, which reads the same in every language.
  const item = (count: number, one: string, many: string) => (count === 1 ? t(one) : tf(many, { count }));
  const parts: string[] = [];
  if (n("supports")) parts.push(item(n("supports"), "1 met", "{count} met"));
  if (n("partially-supports")) parts.push(item(n("partially-supports"), "1 partly met", "{count} partly met"));
  if (n("does-not-support")) parts.push(item(n("does-not-support"), "1 not met", "{count} not met"));
  if (n("not-applicable"))
    parts.push(item(n("not-applicable"), "1 not applicable to this site", "{count} not applicable to this site"));
  const remaining = Math.max(0, needsReview - decided.length);
  const results = parts.join(", ");
  return [
    decided.length === 1
      ? tf("1 of the criteria that need human judgement has been checked by a person: {results}.", { results })
      : tf("{count} of the criteria that need human judgement have been checked by a person: {results}.", {
          count: decided.length,
          results,
        }),
    remaining > 0
      ? remaining === 1
        ? t("1 has not yet been checked manually.")
        : tf("{count} have not yet been checked manually.", { count: remaining })
      : t("Every criterion that needs human judgement has been checked by a person."),
    t("We have not yet tested with assistive technology users."),
  ].join(" ");
}

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
  /** A person's recorded decisions for this site. What turns "we have not
   *  yet carried out a manual audit" into a sentence that is no longer
   *  true — and a statement that keeps saying it after the work was done
   *  is as wrong as one that claims work never done. */
  verdicts?: RecordedVerdict[];
}): string {
  const { organisation, contactEmail, siteUrl, position, conformance, knownIssues, date, verdicts = [] } = opts;
  const org = organisation.trim() || t("[Your organisation]");
  const email = contactEmail.trim() || t("[your contact email]");

  // The document is written in the report's language: its markdown frame
  // (headings, list marks, emphasis) is structure, and every sentence inside
  // it is one key, translated whole.
  const positionSentence =
    position === "partially"
      ? tf(
          '{org} considers {url} to be **partially conformant** with EN 301 549 (which adopts WCAG 2.1 Level AA). "Partially conformant" means some parts of the site do not yet fully conform to the standard.',
          { org, url: siteUrl }
        )
      : tf(
          "{org} considers {url} to be **non-conformant** with EN 301 549 (which adopts WCAG 2.1 Level AA). Non-conformant means the site does not yet meet the standard, and we aim to fix this.",
          { org, url: siteUrl }
        );

  // The model statement in Commission Implementing Decision (EU) 2018/1523
  // requires non-accessible content to be split into three named categories,
  // not one list. Only the first is generated from the scan — the other two
  // are declarations only the owner can make, so they are left as prompts
  // rather than quietly omitted. An omitted mandatory heading is the kind of
  // gap that gets a statement rejected.
  const issuesBlock = `## ${t("Non-accessible content")}

${t("The content below is non-accessible for the following reasons.")}

### ${t("Non-compliance")}

${
  knownIssues.length
    ? `${t("We are aware of the following problems and aim to resolve them:")}

${knownIssues.map((i) => `- ${i}`).join("\n")}`
    : t(
        'An automated check found no failures it is able to detect. That does not mean the site is fully accessible—see "How we assessed this site" below.'
      )
}

### ${t("Disproportionate burden")}

${t(
  "[List here anything you will not fix because it would be a disproportionate burden, and say why. Delete this section if it does not apply.]"
)}

*${t(
  "Note: under Article 14 of the European Accessibility Act, to claim disproportionate burden takes more than a mention. You must carry out and document an assessment, keep it for five years, and inform the relevant market surveillance authority."
)}*

### ${t("Content outside the scope of the legislation")}

${t(
  "[List here anything on the site that the accessibility rules do not cover. Examples: third party content you neither fund nor control, archived material, or office file formats published before the relevant date. Where an accessible alternative exists, say so. Delete this section if it does not apply.]"
)}`;

  // "Method used to prepare the statement" is a required element of the model
  // (Implementing Decision (EU) 2018/1523, and Art. 3(1) on assessment
  // methods). It distinguishes a self-assessment from a third-party audit, and
  // a statement that does not say which is not complete.
  const checkedOn = tf("This statement is based on an automated check carried out on {date}.", { date });
  const assessmentNote = conformance
    ? `${t(
        "**Method used:** self assessment, carried out by the site owner with an automated accessibility checker. It was not a third party evaluation."
      )}

${checkedOn} ${tf("The check covers the {total} Level A and AA success criteria in WCAG 2.1.", { total: conformance.total })}

${tf(
  "{count} of those criteria cannot be assessed by software at all. They depend on human judgement. For example: whether video captions are accurate, or whether a form that times out can be extended. Where the check reports no issue, that means no issue was detected. It does not mean a person has verified the criterion as met.",
  { count: conformance.needsReview }
)}

${manualNote(conformance.needsReview, verdicts)}`
    : checkedOn;

  return `# ${tf("Accessibility statement for {url}", { url: siteUrl })}

${tf("This statement applies to {url}.", { url: siteUrl })}

## ${t("How accessible this website is")}

${positionSentence}

${issuesBlock}

## ${t("How we assessed this site")}

${assessmentNote}

## ${t("Feedback and contact information")}

${tf(
  "If you find an accessibility problem on this site, contact us at {email}. Contact us too if you need information from the site in a different format. We aim to respond within 10 business days.",
  { email }
)}

## ${t("Enforcement procedure")}

${t(
  "If our response to a complaint does not satisfy you, you can escalate. Take it to the body responsible for enforcement in your country."
)}

${t(
  "[Name the enforcement body that applies to you, and link to its complaints procedure. Each EU member state designates its own. For the European Accessibility Act, these are the market surveillance authorities. For public sector bodies, it is the authority named in your country's transposition of Directive (EU) 2016/2102.]"
)}

## ${t("Preparation of this statement")}

${tf("This statement was prepared on {date}. It was last reviewed on {date}.", { date })}

${t("We review this statement at least once a year, and whenever the site changes substantially.")}

## ${t("How this information is published")}

${t(
  "The European Accessibility Act (Article 13(2) and Annex V) asks for more than a page like this one:"
)}

- ${t(
    "**Where it lives.** Annex V says the assessment belongs in your general terms and conditions, or an equivalent document. That assessment explains how the service meets the accessibility requirements. A published page like this one is a good start; it does not on its own satisfy that."
  )}
- ${t(
    "**What format it is in.** The information has to be available *in written and oral format*. It must also be in a form people with disabilities can use. In practice that means this page must itself be accessible. There must also be a way to get the same information from a person directly."
  )}

${t("Annex V also asks for the following. [Add or link to them here.]")}

- ${t("a general description of the service in accessible formats")}
- ${t("whatever explanation is needed to understand how the service works")}
- ${t("a description of how the service meets the requirements in Annex I")}

---
*${t(
    "Draft generated from an automated accessibility check. It follows the structure of the model statement in Commission Implementing Decision (EU) 2018/1523. The Web Accessibility Directive prescribes that template for public sector bodies. It is also the closest formal model for everyone else."
  )}*

*${t(
    'Complete anything in brackets and have it checked before you publish. Two of the three "non-accessible content" headings above are declarations only you can make. A statement is a public, dated, formal declaration. Under the European Accessibility Act, an inaccurate one is its own exposure.'
  )}*
`;
}

// Field, then its value on the next line — one column instead of a
// Field/Value pair sitting side by side, which crushed short labels like
// "Website" into a letter-per-line sliver at phone width while the value
// beside it (a URL, a standard name) was the thing that actually needed
// the room. gloss is optional plain-language cover for a value that's
// standards jargon on its own — a standard's name or a conformance
// term, neither of which means anything to the reader without it.
function SpecCard({
  field,
  value,
  gloss,
  lead = false,
}: {
  field: string;
  value: string;
  gloss?: string;
  /* The first card carries the accent, as the reference's spec sheet does.
     Black on the fill, like every other filled thing here — 5.7:1. */
  lead?: boolean;
}) {
  return (
    <div className={`a11y-spec-card${lead ? " a11y-spec-card-lead" : ""}`}>
      <dt className="a11y-spec-label">{field}</dt>
      <dd className="a11y-spec-value">
        {value}
        {gloss && <span className="a11y-spec-gloss">{gloss}</span>}
      </dd>
    </div>
  );
}

// The month is a word inside a translated sentence, so it follows the
// report's language. English stays en-GB: day before month, house style.
const DATE_LOCALE: Record<Lang, string> = { en: "en-GB", de: "de-DE", es: "es-ES", fr: "fr-FR" };

export function AccessibilityStatement({ report }: { report: AccessibilityReport }) {
  // Read at render, and a dependency of the draft below, so switching the
  // language rewrites the statement rather than leaving the old one cached.
  const lang = getLang();
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
        verdicts: report.verdicts,
        // The report's language, not the viewer's browser locale: house
        // style is European dates (28 June 2025), and that shouldn't change
        // with who's reading. English is en-GB.
        date: new Date(report.scannedAt).toLocaleDateString(DATE_LOCALE[lang], {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }),
    [organisation, contactEmail, report, position, knownIssues, lang]
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
        {t(
          "European law asks for one if you serve EU customers."
        )}
      </p>

      {/* Numbered steps, from the reference's licence builder. This section
          has always been a two-step job — say who it is for, then take the
          text — and it read as a form followed by an unrelated block of
          prose. The numbers say there are two things to do and that you are
          on the first, which is most of what that layout is for.

          The numbers are decoration: each step already has a real heading
          the marker sits beside, so a screen reader hears the heading and
          not "one, two". */}
      <div className="a11y-stmt-step">
        <h3 className="a11y-stmt-step-head">
          <span className="a11y-stmt-step-num" aria-hidden="true">{tf("Step {number}:", { number: 1 })}</span>
          {t("Tell us who this is for")}
        </h3>
      </div>

      <div className="a11y-stmt-fields">
        <label className="a11y-stmt-field">
          {t("Organisation name")}
          <input
            type="text"
            autoComplete="organization"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder={t("Acme Ltd")}
          />
        </label>
        <label className="a11y-stmt-field">
          {t("Contact email for accessibility issues")}
          <input
            type="email"
            autoComplete="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="access@example.com"
          />
        </label>
      </div>

      {/* The statement's declared facts as a spec sheet — the same shape the
          reference uses for a typeface's own specification: a small label
          over a large value, one card per fact, the first one filled.

          A <dl>, not a table. These are name/value pairs and always were —
          the table had a single column and a header reading "What this
          statement says", which is a list wearing a table's clothes. A
          definition list says the same thing to a screen reader in fewer
          words, and it is what lets the facts sit side by side on a wide
          screen and stack on a narrow one without a scrollbar. */}
      <dl className="a11y-spec-grid" aria-label={t("What this statement declares")}>
        <SpecCard field={t("Prepared for")} value={organisation.trim() || t("[Your organisation]")} lead />
        <SpecCard field={t("Website")} value={report.url} />
        <SpecCard
          field={t("Checked against")}
          value="EN 301 549 · WCAG 2.1 AA"
          gloss={t("The EU's technical standard for digital accessibility")}
        />
        <SpecCard
          field={t("Position")}
          value={position === "partially" ? t("Partially conformant") : t("Non-conformant")}
          gloss={
            position === "partially"
              ? t("Meets most requirements, not all of them")
              : t("Doesn't yet meet the standard")
          }
        />
        <SpecCard
          field={t("Problems disclosed")}
          value={knownIssues.length === 0 ? t("None the scan can detect") : String(knownIssues.length)}
        />
      </dl>

      <div className="a11y-stmt-step">
        <h3 className="a11y-stmt-step-head">
          <span className="a11y-stmt-step-num" aria-hidden="true">{tf("Step {number}:", { number: 2 })}</span>
          {t("Take the statement")}
        </h3>
      </div>

      {/* The draft, its label and its Copy on one card, the way the design
          draws it. Copy used to sit in a row above the text with no visible
          tie to it; on the bar it is unmistakably the control for the block
          it sits on. */}
      <div className="a11y-stmt-card">
        <h4 className="a11y-stmt-card-title">{t("The statement")}</h4>
        <div className="a11y-stmt-code">
          <div className="a11y-stmt-code-bar">
            <span className="a11y-stmt-code-label" aria-hidden="true">
              {t("Generated statement")}
            </span>
            <button type="button" className="a11y-sr-play" onClick={copy}>
              {copied ? t("Copied") : t("Copy")}
            </button>
          </div>
          {/* Focusable on purpose. The block scrolls (overflow: auto), and a
              scrollable box that can't be focused is unreachable by keyboard —
              you can see there's more text and have no way to get to it. Giving
              it tabindex="0" puts it in the tab order so arrow keys work, and the
              role plus label mean it's announced as something worth entering
              rather than an unnamed stop. This is WCAG 2.1.1, which the checker
              flags on other people's sites. */}
          {/* Drawn as a document, not as its markdown source: the headings,
              bold and lists are rendered, and Copy still copies the markdown
              so it pastes into a CMS as structure (16 Oct 2026). */}
          <div
            className="a11y-stmt-text"
            tabIndex={0}
            role="region"
            aria-label={t("Draft accessibility statement")}
          >
            {renderReply(statement)}
          </div>
        </div>
        {/* The button's own text changing is not reliably announced;
            this mounted status region is. */}
        <span className="a11y-sr-only" role="status">
          {copied ? t("Statement copied to the clipboard.") : ""}
        </span>
        {/* No "Says partially conformant, based on N failed criteria" line:
            the Position and Problems disclosed cards above say both. */}
      </div>

      <p className="a11y-conf-caveat">
        <strong>{t("Read it before you publish.")}</strong>{" "}
        {t("Make sure it matches the testing you have actually done. A starting point, not legal advice.")}
      </p>
    </section>
  );
}
