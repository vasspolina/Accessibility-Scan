import { t } from "./strings";

/**
 * The scan's itinerary, in the order the backend runs it.
 *
 * Ids arrive over /api/scan/progress/:id as the pipeline crosses each
 * boundary — see backend services/progress/milestones.ts, which this list
 * must match. The sentences are flat statements of what is happening,
 * deliberately: the playfulness of the waiting screen is typographic, not
 * verbal, and every line is true at the moment it is shown.
 */
export const NARRATION_STEPS = [
  { id: "load", label: () => t("Loading your page") },
  { id: "rules", label: () => t("Running the automated rules") },
  { id: "screen-reader", label: () => t("Reading the page as a screen reader announces it") },
  { id: "photograph", label: () => t("Photographing the evidence") },
  { id: "keyboard", label: () => t("Walking every Tab stop") },
  { id: "text-resize", label: () => t("Enlarging the text") },
  { id: "phone", label: () => t("Trying it at phone width") },
  { id: "ai-review", label: () => t("The AI review reads the page") },
  { id: "report", label: () => t("Writing the report") },
] as const;

export type NarrationStepId = (typeof NARRATION_STEPS)[number]["id"];

/** How far along the itinerary the given milestone sits, 0-based; -1 for an
 *  id this build does not know (an older widget against a newer backend
 *  narrates what it can and ignores the rest). */
export function narrationIndex(id: string): number {
  return NARRATION_STEPS.findIndex((s) => s.id === id);
}

/** The reader's sentence for a milestone id, in the current language. */
export function narrationLabel(id: string): string | undefined {
  return NARRATION_STEPS.find((s) => s.id === id)?.label();
}

/** Opens the milestone stream for one scan. Returns a close function.
 *  Failure is silence, never an error: the narration is decoration on the
 *  scan, and a blocked stream leaves the waiting screen exactly as it was. */
export function watchScanProgress(
  apiBase: string,
  progressId: string,
  onMilestone: (id: string) => void
): () => void {
  if (typeof EventSource === "undefined") return () => {};
  let source: EventSource | undefined;
  try {
    source = new EventSource(`${apiBase.replace(/\/$/, "")}/api/scan/progress/${progressId}`);
  } catch {
    return () => {};
  }
  source.onmessage = (e) => {
    if (e.data === "done") {
      source?.close();
      return;
    }
    onMilestone(e.data);
  };
  source.onerror = () => {
    // An older backend has no such route; a proxy may refuse the stream.
    // Either way the scan itself is unaffected — stop listening.
    source?.close();
  };
  return () => source?.close();
}

/** A channel id: a handle the widget invents, never data. */
export function newProgressId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
