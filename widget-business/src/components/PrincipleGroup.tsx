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
            {/* Before the heading, not after it. The kit's section head reads
                index -> title -> lead, and this is the index. It stays OUTSIDE
                the h3 for the original reason — inside, "Perceivable" would
                join the heading's accessible name and restate the category the
                heading already asks about — but a sibling ahead of it is read
                once, in the order it is seen. Moving it in the DOM rather than
                with CSS order keeps reading order and visual order together. */}
            {/* The design pairs the principle with its count on one centred
                line above the question — a dark pill and a round badge —
                rather than trailing the count inside the heading. The count
                leaves the h3 with it: "Can people see and hear it? (9)" is
                a heading whose accessible name ends in a number, and a
                screen-reader user listing headings heard the parenthetical
                every time. It keeps its own words in the badge instead. */}
            <p className="a11y-principle-head">
              {info && <span className="a11y-principle-term">{principle}</span>}
              <span className="a11y-principle-count">
                <span aria-hidden="true">{groupFindings.length}</span>
                <span className="a11y-sr-only">
                  {groupFindings.length === 1 ? "1 finding" : `${groupFindings.length} findings`}
                </span>
              </span>
            </p>
            <h3 className="a11y-principle-title">{info?.plainTitle ?? principle}</h3>
            {info && <p className="a11y-principle-desc">{info.plainDescription}</p>}
            <FindingsList findings={groupFindings} />
          </div>
        );
      })}
      {unclassified.length > 0 && (
        <div className="a11y-principle-group">
          <p className="a11y-principle-head">
            <span className="a11y-principle-term">Best practice</span>
            <span className="a11y-principle-count">
              <span aria-hidden="true">{unclassified.length}</span>
              <span className="a11y-sr-only">
                {unclassified.length === 1 ? "1 finding" : `${unclassified.length} findings`}
              </span>
            </span>
          </p>
          <h3 className="a11y-principle-title">Worth a look anyway</h3>
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
