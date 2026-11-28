import type { AccessibilityReport } from "../api/scanClient";
import { findingsCsv, findingsCsvFilename } from "../lib/findingsCsv";
import { t } from "../lib/strings";
import { Icon } from "./Icon";

/**
 * The findings as a file: one press saves every accessibility finding of the
 * report on screen as a CSV (lib/findingsCsv.ts says what is in it).
 *
 * It sits at the head of the findings, beside their title, in both readings
 * (user's choice, 22 Nov 2026): with the rows it saves, and not in the
 * Report actions block, which sends or prints the whole report and keeps
 * its own layout. A site audit has no button: it returns counts for
 * each page and no findings to write.
 *
 * The file is built in the browser from the report already here. Nothing is
 * sent anywhere, so a scan behind a login can be saved too.
 */
export function FindingsCsvButton({
  report,
  describedBy,
}: {
  report: AccessibilityReport;
  /* The id of the heading it stands beside. The button's own name says what
     it does; the heading says of what, to someone who reaches it by Tab. */
  describedBy: string;
}) {
  // Nothing to write: a file of column titles alone looks like a fault.
  if (!report.findings.some((f) => f.category === "accessibility")) return null;

  function save() {
    const url = URL.createObjectURL(new Blob([findingsCsv(report)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = findingsCsvFilename(report);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="a11y-findings-csv" aria-describedby={describedBy} onClick={save}>
      {t("Download as CSV")}
      {/* The same download mark as the PDF button's, so the two read as the
          same kind of act. */}
      <Icon name="download" className="a11y-findings-csv-icon" />
    </button>
  );
}
