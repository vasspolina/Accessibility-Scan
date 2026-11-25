import type { ReactNode } from "react";
import { t } from "../lib/strings";

/**
 * The progress bar and the notification, brought across from the kit.
 *
 * Both carry ARIA, so both are copied behaviour-first and the markup is
 * reproduced exactly rather than tidied.
 *
 * ProgressBar: role="progressbar" with aria-valuenow/min/max, named by the
 * same label the reader sees. The percentage beside it is aria-hidden on
 * purpose — it repeats what aria-valuenow already carries, and a screen
 * reader announcing both says the number twice.
 *
 * Notification: role="alert" for errors, role="status" for everything else.
 * That distinction is the whole component. An alert interrupts whatever is
 * being read; a status waits its turn. Getting it backwards either buries an
 * error or talks over somebody mid-sentence, so the kit's mapping is kept
 * exactly, including that only `error` earns the interruption.
 */

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  detail,
}: {
  value?: number;
  max?: number;
  label: string;
  /** Right of the label, e.g. "31 of 42 pages". Optional — the bar reads
   *  correctly without it, and not every scan knows its page count. */
  detail?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="a11y-progress">
      <div className="a11y-progress-head">
        <span className="a11y-progress-label">{label}</span>
        {detail && <span className="a11y-progress-detail">{detail}</span>}
      </div>
      {/* The percentage is its own block beneath the head row, set large, with
          the unit at a fraction of the numeral's size. aria-hidden because
          aria-valuenow on the track below already carries the number — a
          screen reader should hear it once, not twice. */}
      <p className="a11y-progress-pct" aria-hidden="true">
        <span className="a11y-progress-num">{pct}</span>
        <span className="a11y-progress-unit">%</span>
      </p>
      <div
        className="a11y-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="a11y-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export type NotificationKind = "error" | "success" | "warning" | "info";

export function Notification({
  kind = "info",
  title,
  subtitle,
}: {
  kind?: NotificationKind;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className={`a11y-note a11y-note-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {/* No icon before the words (user's instruction, 25 Nov 2026, "delete
          these icons", on the enamel pins that marked info, error and
          success): the title says the kind. A warning keeps its small badge
          with the word "Warning" (23 Nov 2026), which is read out. */}
      {kind === "warning" && <span className="a11y-note-badge">{t("Warning")}</span>}
      <div className="a11y-note-body">
        <div className="a11y-note-title">{title}</div>
        {subtitle && <div className="a11y-note-sub">{subtitle}</div>}
      </div>
    </div>
  );
}
