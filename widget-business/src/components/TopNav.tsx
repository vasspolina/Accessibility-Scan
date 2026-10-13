import type { ReactNode } from "react";
import { t } from "../lib/strings";

/**
 * The design's top bar: the product as a pill and the run controls.
 *
 * It used to carry a shortlist of four links (Overview, Findings, Pages,
 * Statement) as a second route to sections the Sections rail already lists.
 * Two navigations to the same places was one too many, so the links are gone
 * and the rail is the only way to jump around the report.
 */
export function TopNav({
  actions,
}: {
  /* The run controls, supplied by App so this stays presentational and the
     buttons keep whatever behaviour their own mode gives them. */
  actions?: ReactNode;
}) {
  if (!actions) return null;

  return (
    <div className="a11y-topnav">
      <div className="a11y-topnav-actions">{actions}</div>
    </div>
  );
}
