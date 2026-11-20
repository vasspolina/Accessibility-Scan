import { t, tf } from "../lib/strings";
import type { AccessibilityFinding } from "../api/scanClient";
import { groupFindings } from "./FindingsList";
import { SeverityTag } from "./SeverityTag";
import { plainForRule } from "../lib/wcagPlain";
import { fixKindForFinding } from "../lib/testMethod";
import { severityLabel } from "./FindingGroup";

/**
 * Where to start: the most serious problems of the scan, one per card,
 * scattered across the width (user's reference, 15 Nov 2026: a page of
 * review cards, each a round block with one line in it).
 *
 * It is the top of the findings schedule and nothing else: the same
 * grouping (groupFindings), the same title a row shows, the same severity
 * word and the same fix owner, so a card and its row cannot disagree. The
 * schedule below still holds every finding; a card only takes the reader
 * to it.
 */

/** Five fills a screen without becoming a second list. */
export const TOP_FINDINGS = 5;

export function TopFindings({
  findings,
  onSee,
}: {
  findings: AccessibilityFinding[];
  onSee: () => void;
}) {
  const groups = groupFindings(findings).slice(0, TOP_FINDINGS);
  if (groups.length === 0) return null;

  return (
    <section className="a11y-top" aria-labelledby="a11y-top-heading">
      <h2 className="a11y-top-title" id="a11y-top-heading">
        {t("Where to start")}
      </h2>
      <ul className="a11y-top-list" role="list">
        {groups.map((group) => {
          const rep = group[0];
          const title = plainForRule(rep.ruleId)?.plain ?? rep.title ?? rep.description;
          return (
            <li key={rep.ruleId ?? rep.id}>
              <button type="button" className="a11y-top-card" onClick={onSee}>
                <SeverityTag severity={rep.severity} label={t(severityLabel[rep.severity])} />
                <span className="a11y-top-card-title">{title}</span>
                <span className="a11y-top-card-small">
                  <span>{fixKindForFinding(rep).label}</span>
                  {group.length > 1 && <span>{tf("{count} places", { count: group.length })}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
