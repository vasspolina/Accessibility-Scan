import type { AccessibilityFinding } from "../api/scanClient";
import { FindingsList } from "./FindingsList";
import { SectionHeader } from "./SectionHeader";

export function ReportSection({
  title,
  eyebrow,
  description,
  variant,
  findings,
  asNotes = false,
  id,
}: {
  title: string;
  /** The kit's uppercase category line above the title. */
  eyebrow?: string;
  description: string;
  variant: "default" | "redflag";
  findings: AccessibilityFinding[];
  // Renders the section as remarks on the design rather than as a defect
  // list. These findings have never counted towards the score, but they were
  // shown with the same "Fix first / Fix soon" ranking as the ones that do,
  // which is a strong enough signal to override the sentence saying so.
  asNotes?: boolean;
  // Ties the section landmark to its own heading via aria-labelledby, so a
  // reader browsing by landmark reaches this section by name instead of
  // finding one undifferentiated region covering the whole report.
  id?: string;
}) {
  // The kit's TrustIssues screen reads differently from every other section:
  // the tint IS the alert, so the headline leads it and the category line
  // sits underneath as a caption — reversed from the eyebrow-first anatomy
  // every other section shares (see SectionHeader's own comment). The
  // finding rows then sit outside the tint, under their own column labels,
  // on the card's plain surface — the warning colour marks the claim, not
  // the evidence for it.
  if (variant === "redflag") {
    return (
      <section className="a11y-section a11y-section-redflag" aria-labelledby={id}>
        <div className="a11y-section-tint">
          <h2 className="a11y-section-title" id={id}>
            {title} <span className="a11y-section-count">({findings.length})</span>
          </h2>
          {eyebrow && <span className="a11y-section-eyebrow">{eyebrow}</span>}
          <p className="a11y-section-desc">{description}</p>
        </div>
        <FindingsList findings={findings} asNotes={asNotes} />
      </section>
    );
  }

  return (
    <section className={`a11y-section a11y-section-${variant}`} aria-labelledby={id}>
      <SectionHeader eyebrow={eyebrow} title={title} qualifier={`(${findings.length})`} id={id} />
      <p className="a11y-section-desc">{description}</p>
      <FindingsList findings={findings} asNotes={asNotes} />
    </section>
  );
}
