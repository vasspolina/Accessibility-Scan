/**
 * How long a scan takes, said once.
 *
 * The form promised "about 15 seconds" while the waiting message promised
 * twenty to forty, and both shipped for months. They were written in
 * different files at different times and nothing connected them, so the
 * contradiction was invisible from either side — a reader saw one of them
 * before pressing the button and the other immediately after.
 *
 * The numbers come from measurement, recorded in App.tsx's own comment when
 * the waiting copy was corrected: a light page finishes in about twenty
 * seconds, moma.org takes forty, and the Guardian has taken eighty. A live
 * scan of example.com — a trivial page — came back in seven. "About 15
 * seconds" was true of the fixtures and of nothing else, which is exactly
 * the kind of promise that expires while the visitor watches.
 *
 * The AI figure is the same arithmetic from the other side: a page alone is
 * twenty to forty, with the review it is "about a minute", so the review
 * itself adds roughly half of one.
 *
 * Anything that tells a visitor how long to wait reads from here.
 */
export const SCAN_DURATION = {
  /** A single page, typical case. Heavy pages run longer and the waiting
   *  message says so once it has waited long enough to know. */
  page: "twenty to forty seconds",
  /** A whole site, page by page. */
  site: "a few minutes",
  /** What the AI review adds on top of a page scan. */
  aiAdds: "about half a minute",
} as const;
