import type { CSSProperties } from "react";
import { SeverityTag } from "../SeverityTag";
import type { AccessibilityFinding } from "../../api/scanClient";

/**
 * A finding as a row, ported from components/scan/IssueRow.jsx.
 *
 * New to this package — nothing is replaced, so nothing breaks by adding it.
 * The report currently renders findings as a DataTable, and the annotation
 * is clear about when each applies: "Reach for DataTable when findings need
 * sorting, columns, or per-row expansion; IssueRow is for a short editorial
 * list." The findings table needs per-row expansion, so it stays a table.
 * This is for the short lists — a top-three, a related set.
 *
 * The whole row is one <button>, which is the source's shape and the right
 * one: the row does a single thing when activated, so it is a single
 * control. That also means it needs no role, no tabindex and no key handler
 * — a real button brings all of it.
 *
 * The hover/focus inversion lives in IssueRow.css rather than in state here;
 * the reason, including a bug it fixes in the source, is written there.
 */

type Severity = AccessibilityFinding["severity"] | "pass";

export function IssueRow({
  severity = "moderate",
  title,
  criterion,
  count,
  selector,
  onClick,
  style,
}: {
  severity?: Severity;
  title: string;
  criterion: string;
  count?: number;
  selector?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button type="button" className="a11y-issue-row" onClick={onClick} style={style}>
      <SeverityTag severity={severity} />
      <span className="a11y-issue-row-main">
        <span className="a11y-issue-row-title">{title}</span>
        <span className="a11y-issue-row-meta">
          {criterion}
          {selector ? ` · ${selector}` : ""}
        </span>
      </span>
      {/* `!= null`, not truthiness: a count of 0 is meaningful here and
          `count && …` would drop it silently. */}
      {count != null && (
        <span className="a11y-issue-row-count">
          <span className="a11y-issue-row-number">{count}</span>
          {/* The multiplication sign is read as "times" by some screen
              readers and skipped by others, and either way the number alone
              is ambiguous out of context. The visible mark stays for sighted
              readers; the accessible name spells it out. */}
          <span className="a11y-issue-row-times" aria-hidden="true">
            ×
          </span>
          <span className="a11y-sr-only">
            {count === 1 ? "1 place affected" : `${count} places affected`}
          </span>
        </span>
      )}
    </button>
  );
}
