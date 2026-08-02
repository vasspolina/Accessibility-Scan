import type { AccessibilityFinding } from "../api/scanClient";
import { classifyWcag, PRINCIPLE_ORDER, type Principle } from "../lib/wcagPlain";
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
    return <p className="a11y-empty">Nothing found here.</p>;
  }

  return (
    <div className="a11y-principle-groups">
      {PRINCIPLE_ORDER.map((principle) => {
        const groupFindings = byPrinciple.get(principle);
        if (!groupFindings || groupFindings.length === 0) return null;
        const info = classifyWcag(groupFindings[0].wcagCriterion);
        return (
          <div className="a11y-principle-group" key={principle}>
            <h3 className="a11y-principle-title">
              {info?.plainTitle ?? principle}{" "}
              <span className="a11y-section-count">({groupFindings.length})</span>
            </h3>
            {/* Outside the heading on purpose: "Perceivable" restates the
                category the heading already asks about, so a screen reader
                reading the h3 should not have to hear it twice. */}
            {info && <span className="a11y-principle-term">{principle}</span>}
            {info && <p className="a11y-principle-desc">{info.plainDescription}</p>}
            <FindingsList findings={groupFindings} />
          </div>
        );
      })}
      {unclassified.length > 0 && (
        <div className="a11y-principle-group">
          <h3 className="a11y-principle-title">
            Worth a look anyway{" "}
            <span className="a11y-section-count">({unclassified.length})</span>
          </h3>
          <p className="a11y-principle-desc">
            Not tied to a specific WCAG rule, but still worth a look. These are widely recommended
            practices for a well built, accessible site.
          </p>
          <FindingsList findings={unclassified} />
        </div>
      )}
    </div>
  );
}
