import { chromium, type Browser, type Page } from "playwright";
import { env } from "../../config/env.js";
import { withTimeout } from "../../utils/timeout.js";
import { logger } from "../../utils/logger.js";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
    try {
      const browser = await browserPromise;
      browser.on("disconnected", () => {
        logger.warn("Chromium browser disconnected — will relaunch on next request");
        browserPromise = null;
      });
    } catch (err) {
      // Without this, a single failed launch (transient resource
      // exhaustion, etc.) leaves the rejected promise cached forever —
      // `!browserPromise` is false for a rejected-but-settled promise, so
      // every future request would return the same stale rejection with no
      // way to ever recover short of a process restart.
      browserPromise = null;
      throw err;
    }
  }
  return browserPromise;
}

// Simple FIFO semaphore so we never have more than MAX_CONCURRENT_RENDERS
// pages open at once — Chromium is memory/CPU heavy and an unbounded queue
// of concurrent renders will OOM the host.
let activeCount = 0;
const waitQueue: Array<() => void> = [];

// Long enough that a short rush queues quietly, short enough that nobody
// watches a spinner forever wondering whether it is working.
const MAX_QUEUE_WAIT_MS = 90_000;

export class ServiceBusyError extends Error {
  constructor() {
    super("All scanners are busy");
    this.name = "ServiceBusyError";
  }
}

async function acquireSlot(): Promise<void> {
  if (activeCount < env.MAX_CONCURRENT_RENDERS) {
    activeCount += 1;
    return;
  }
  let waiter: (() => void) | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      waiter = resolve;
      waitQueue.push(resolve);
      setTimeout(() => reject(new ServiceBusyError()), MAX_QUEUE_WAIT_MS);
    });
  } catch (err) {
    // Drop out of the queue so releaseSlot does not hand a slot to a request
    // that has already given up, which would leak the slot until the next one.
    const i = waiter ? waitQueue.indexOf(waiter) : -1;
    if (i >= 0) waitQueue.splice(i, 1);
    throw err;
  }
  activeCount += 1;
}

function releaseSlot(): void {
  activeCount -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

/**
 * Runs `fn` with a fresh page, at most MAX_CONCURRENT_RENDERS at a time.
 *
 * `budgetMs` times the work, and the timer deliberately starts here — after a
 * slot is free and the page exists — rather than when the request arrived.
 *
 * That distinction is the whole point. The budget used to be applied around
 * this call, so time spent queueing counted against it: a request could wait
 * for a slot, render perfectly well inside its allowance, and still be
 * reported as "this page took too long to load". Measured after lowering the
 * concurrency limit, five simultaneous scans all failed that way while a
 * single scan of the same site rendered in five seconds. The page was never
 * the problem, and telling the owner it was would have sent them looking for a
 * fault that does not exist.
 *
 * Queue time is bounded separately, and being busy is its own answer.
 */
export async function withPage<T>(fn: (page: Page) => Promise<T>, budgetMs?: number): Promise<T> {
  await acquireSlot();
  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      // Names the real engine and the bot, in that order.
      //
      // A bare "A11yCheckerBot/0.1" is honest but incomplete, and sites that
      // sniff the user agent to decide what to serve read it as an unknown
      // browser and hand back a degraded page. Measured on usbank.com: with
      // the bare token the hero panel collapses to ~130px with one word per
      // line and the account login form is replaced by "The portal doesn't
      // support your current browser"; with this string the same page renders
      // correctly. Scanning that degraded page and scoring the site on it is
      // the same mistake as scoring a bot-block page — a report about
      // something no visitor sees.
      //
      // This is a truthful declaration, not a disguise: the engine really is
      // headless Chromium, and A11yCheckerBot is still in the string, so
      // robots rules, log filters and allowlists keyed on it all still work
      // (see BlockedNotice, which tells owners to allowlist that token).
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 " +
        "A11yCheckerBot/0.1 (+accessibility scan)",
      // Fixed viewport so the review screenshot (see renderPage.ts) is
      // consistent in size/cost across scans regardless of the host machine.
      viewport: { width: 1280, height: 900 },
      // axe-core is injected into the page as a script, which a strict
      // Content-Security-Policy ("script-src 'self'") refuses — the scan then
      // fails outright with "Executing inline script violates ... CSP" rather
      // than degrading. That hits exactly the sites most likely to care about
      // this report: government, banking, healthcare. Bypassing CSP affects
      // only our own automation inside this throwaway context — it changes
      // nothing about the page we render or what we report about it.
      bypassCSP: true,
    });
    try {
      const page = await context.newPage();
      const work = fn(page);
      return budgetMs ? await withTimeout(work, budgetMs, "Page render") : await work;
    } finally {
      await context.close();
    }
  } finally {
    // Must run regardless of whether the failure happened inside fn() or
    // during browser/context/page setup — previously only the fn() path
    // released the slot, so a launch/context/page failure permanently
    // leaked a concurrency slot. After MAX_CONCURRENT_RENDERS such
    // failures every future scan would queue forever.
    releaseSlot();
  }
}

export async function shutdownBrowserPool(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
