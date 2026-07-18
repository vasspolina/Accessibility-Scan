import { chromium, type Browser, type Page } from "playwright";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
    const browser = await browserPromise;
    browser.on("disconnected", () => {
      logger.warn("Chromium browser disconnected — will relaunch on next request");
      browserPromise = null;
    });
  }
  return browserPromise;
}

// Simple FIFO semaphore so we never have more than MAX_CONCURRENT_RENDERS
// pages open at once — Chromium is memory/CPU heavy and an unbounded queue
// of concurrent renders will OOM the host.
let activeCount = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeCount < env.MAX_CONCURRENT_RENDERS) {
    activeCount += 1;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeCount += 1;
}

function releaseSlot(): void {
  activeCount -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  await acquireSlot();
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "A11yCheckerBot/0.1 (+accessibility scan)",
    // Fixed viewport so the review screenshot (see renderPage.ts) is
    // consistent in size/cost across scans regardless of the host machine.
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
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
