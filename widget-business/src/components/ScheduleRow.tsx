import { useEffect, useId, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Select } from "./Select2";
import { t } from "../lib/strings";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  setScheduleEnabled,
  ScanError,
  type Schedule,
  type SchedulerStatus,
} from "../api/scanClient";

/**
 * Scheduled scans, as one row of the run's settings.
 *
 * The server has had schedules since the third audit; until now they were
 * reachable only with curl. This is the screen: for the page just
 * scanned, the schedule that exists — next run, last score, pause, delete
 * — or a form to make one. Shown only for a saved scan, because a schedule
 * belongs to an account.
 *
 * What the server warns about is shown, never swallowed: a scheduler that
 * is off, or a notify address on a server without mail, would otherwise be
 * a schedule that looks alive and never does anything.
 */
const EVERY: Array<{ value: string; label: string }> = [
  { value: "24", label: "Every day" },
  { value: "168", label: "Every week" },
  { value: "6", label: "Every 6 hours" },
];

function sameUrl(a: string, b: string): boolean {
  try {
    const x = new URL(a), y = new URL(b);
    x.hash = ""; y.hash = "";
    return x.toString().replace(/\/$/, "") === y.toString().replace(/\/$/, "");
  } catch {
    return a === b;
  }
}

export function ScheduleRow({ apiBase, url }: { apiBase: string; url: string }) {
  const id = useId();
  const [all, setAll] = useState<Schedule[] | null>(null);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [every, setEvery] = useState("24");
  const [email, setEmail] = useState("");

  async function load() {
    try {
      const r = await fetchSchedules(apiBase);
      setAll(r.schedules);
      setStatus(r.scheduler);
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Could not load the schedules.");
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, url]);

  const mine = all?.find((s) => sameUrl(s.url, url)) ?? null;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await createSchedule(apiBase, { url, everyHours: Number(every), notifyEmail: email.trim() || undefined });
      setWarnings(r.warnings ?? []);
      await load();
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Could not create the schedule.");
    } finally {
      setBusy(false);
    }
  }
  // A failure is shown, never swallowed: the delete above failed silently
  // once and the row kept showing a schedule that was still there.
  async function toggle() {
    if (!mine) return;
    setBusy(true);
    setError(null);
    try {
      await setScheduleEnabled(apiBase, mine.id, !mine.enabled);
      await load();
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Could not change the schedule.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!mine) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSchedule(apiBase, mine.id);
      setWarnings([]);
      await load();
    } catch (err) {
      setError(err instanceof ScanError ? err.message : "Could not delete the schedule.");
    } finally {
      setBusy(false);
    }
  }

  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="a11y-settings-row">
      <span className="a11y-settings-label" id={`${id}-label`}>
        {t("Scheduled scans")}
      </span>
      {error && (
        <p className="a11y-settings-state" role="alert">
          {error}
        </p>
      )}
      {all === null && !error && <span className="a11y-settings-state">Loading…</span>}
      {mine ? (
        <>
          <span className="a11y-settings-state">
            {mine.enabled ? `Runs ${EVERY.find((o) => o.value === String(mine.everyHours))?.label.toLowerCase() ?? `every ${mine.everyHours} hours`}. ` : "Paused. "}
            {mine.lastRunAt
              ? `Last run ${when(mine.lastRunAt)}${mine.lastScore !== null ? `, score ${mine.lastScore}` : ""}. `
              : "Not run yet. "}
            {mine.enabled ? `Next ${when(mine.nextRunAt)}.` : ""}
            {mine.lastError ? ` Last run failed: ${mine.lastError}` : ""}
            {mine.notifyEmail ? ` Writes to ${mine.notifyEmail} if the score drops or a new finding appears.` : ""}
          </span>
          {status && !status.enabled && <span className="a11y-settings-state">The scheduler is off on this server. This schedule will not run until it is on.</span>}
          {status && mine.notifyEmail && !status.mail && <span className="a11y-settings-state">Mail is not set up on this server. No email will be sent.</span>}
          <div className="a11y-manual-form-actions">
            <Button variant="secondary" size="sm" onClick={toggle} disabled={busy}>
              {mine.enabled ? "Pause" : "Resume"}
            </Button>
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
              Delete the schedule
            </Button>
          </div>
        </>
      ) : all !== null ? (
        <form className="a11y-manual-form" onSubmit={create} aria-labelledby={`${id}-label`}>
          <span className="a11y-settings-state">Scan this page automatically. If the score drops or a new finding appears, you are told.</span>
          <Select id={`${id}-every`} label="How often" options={EVERY} value={every} onChange={(e) => setEvery(e.target.value)} />
          <Input
            id={`${id}-email`}
            label="Email for a worse result (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputProps={{ autoComplete: "email" }}
          />
          {warnings.map((w) => (
            <span key={w} className="a11y-settings-state">{w}</span>
          ))}
          <div className="a11y-manual-form-actions">
            <Button variant="secondary" size="sm" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Schedule it"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
