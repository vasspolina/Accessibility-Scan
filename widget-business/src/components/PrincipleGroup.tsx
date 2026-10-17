import type { AccessibilityFinding } from "../api/scanClient";
import { classifyWcag, principleText, PRINCIPLE_ORDER, type Principle } from "../lib/wcagPlain";
import { t, tf } from "../lib/strings";
import { FindingsList } from "./FindingsList";

// Groups accessibility-category findings by WCAG principle (Perceivable /
// Operable / Understandable / Robust) instead of showing raw criterion
// codes — plus a trailing bucket for axe's "best-practice" rules, which
// have no numbered WCAG criterion at all (~30 rules: landmark-one-main,
// empty-heading, etc.) and so don't classify into any principle.
export function PrincipleGroup({ findings }: { findings: AccessibilityFinding[] }) {
  const byPrinciple = new Map<Principle, AccessibilityFinding[]>();
  const unclassified: AccessibilityFinding[] = [];

  for (const finding of findings) {
    const info = classifyWcag(finding.wcagCriterion);
    if (!info) {
      unclassified.push(finding);
      continue;
    }
    const bucket = byPrinciple.get(info.principle) ?? [];
    bucket.push(finding);
    byPrinciple.set(info.principle, bucket);
  }

  if (findings.length === 0) {
    return <p className="a11y-empty">{t("Nothing found here.")}</p>;
  }

  const present = PRINCIPLE_ORDER.filter((p) => (byPrinciple.get(p) ?? []).length > 0);

  return (
    <div className="a11y-principle-groups">
      {PRINCIPLE_ORDER.map((principle) => {
        const groupFindings = byPrinciple.get(principle);
        if (!groupFindings || groupFindings.length === 0) return null;
        const info = classifyWcag(groupFindings[0].wcagCriterion);
        // The heading parts in the report's language; English when the
        // language file has no entry.
        const text = info ? principleText(info) : undefined;
        return (
          <div className="a11y-principle-group" key={principle}>
            {/* Before the heading, not after it. The kit's section head reads
                index -> title -> lead, and this is the index. It stays OUTSIDE
                the h3 for the original reason — inside, "Perceivable" would
                join the heading's accessible name and restate the category the
                heading already asks about — but a sibling ahead of it is read
                once, in the order it is seen. Moving it in the DOM rather than
                with CSS order keeps reading order and visual order together. */}
            {/* The group head is the title and its one-line description.
                The pill row that sat above it (principle name, count, WCAG
                levels) and the "Next category" chip beside it are gone
                (14 Oct 2026): badges across the content, each repeating what
                the title, the section count, the Level column or the
                Sections rail already says. */}
            <div className="a11y-pg-head">
              <div className="a11y-pg-titles">
                <h3 className="a11y-principle-title" id={`a11y-pg-${principle}-title`} tabIndex={-1}>
                  {text?.plainTitle ?? principle}
                </h3>
                {text && <p className="a11y-principle-desc">{text.plainDescription}</p>}
              </div>
            </div>
            <FindingsList findings={groupFindings} />
          </div>
        );
      })}
      {unclassified.length > 0 && (
        <div className="a11y-principle-group">
          {/* The same head as the principle groups: a title and its count.
              The "Worth a look anyway" title and the sentence under it said
              only that these are worth a look, which is what listing them
              already says. */}
          <div className="a11y-pg-head">
            <div className="a11y-pg-titles">
              <h3 className="a11y-principle-title">
                {t("Best practice")}{" "}
                <span className="a11y-principle-count">
                  <span aria-hidden="true">({unclassified.length})</span>
                  <span className="a11y-sr-only">
                    {unclassified.length === 1 ? t("1 finding") : tf("{count} findings", { count: unclassified.length })}
                  </span>
                </span>
              </h3>
            </div>
          </div>
          <FindingsList findings={unclassified} />
        </div>
      )}
    </div>
  );
}
