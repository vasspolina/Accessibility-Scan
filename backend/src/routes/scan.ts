import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { accountForKey, bearerFrom } from "../storage/accounts.js";
import { saveScan } from "../storage/scans.js";
import { verdictsForSite } from "../storage/verdicts.js";
import { findingStates } from "../storage/triage.js";
import { logger } from "../utils/logger.js";
import { describeScanFailure } from "../services/scanFailure.js";
import { memorySnapshot, trackPeakMemory } from "../utils/memory.js";
import { scanUrlToReport } from "../services/scanPipeline.js";
import {
  publish as publishProgress,
  finish as finishProgress,
  subscribe as subscribeProgress,
} from "../services/progress/registry.js";
import { env } from "../config/env.js";
import type { AccessibilityReport, ReportVerdict } from "../types/report.js";

// Sign-in details for scanning pages behind a login. Accepted per request,
// held in memory for one scan, and never stored, logged, or included in the
// report. See services/auth/authenticate.ts for the full handling rules.
const authSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cookies"),
    cookies: z
      .array(
        z.object({
          name: z.string().min(1),
          value: z.string(),
          domain: z.string().optional(),
          path: z.string().optional(),
        })
      )
      .min(1)
      .max(50),
  }),
  z.object({
    kind: z.literal("form"),
    loginUrl: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    usernameSelector: z.string().optional(),
    passwordSelector: z.string().optional(),
    submitSelector: z.string().optional(),
  }),
]);

const scanBodySchema = z.object({
  url: z.string().min(1, "url is required"),
  auth: authSchema.optional(),
  // Lets the embedder opt out of the AI judgment layer per-scan (faster,
  // cheaper — automated axe-core findings only). Defaults to on.
  includeAiReview: z.boolean().optional().default(true),
  // The report's language ("en" | "de" | "es" | "fr"; anything else
  // falls back to English). Only reader-facing sentences move — criterion
  // numbers, official names and levels are the standard's own.
  language: z.string().optional(),
  // A channel id the widget invented, for watching the scan's milestones on
  // GET /api/scan/progress/:id while this request runs. Shape-limited
  // because it becomes a Map key: no user data, no URL, just a handle.
  progressId: z
    .string()
    .regex(/^[A-Za-z0-9-]{8,64}$/)
    .optional(),
});

export async function scanRoutes(app: FastifyInstance) {
  // The scan's narration: milestones for the id the POST body named, as
  // server-sent events. Hijacks the raw response, so the CORS header is set
  // by hand — the cors plugin's hook never runs on a hijacked reply, and
  // this stream is read by the same embedded widgets the wide-open policy
  // exists for. Events are ids from a fixed list, never data.
  app.get("/api/scan/progress/:id", (request, reply) => {
    const { id } = request.params as { id: string };
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      return reply.status(400).send({ error: "Invalid progress id" });
    }

    const origin = request.headers.origin;
    const allowOrigin =
      env.ALLOWED_ORIGINS === "*"
        ? "*"
        : origin && env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).includes(origin)
          ? origin
          : null;

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // A proxy that buffers an event stream turns narration into a lump
      // that arrives with the report. X-Accel-Buffering is the convention
      // nginx-family proxies honour.
      "X-Accel-Buffering": "no",
      ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    });

    const send = (event: string) => {
      res.write(`data: ${event}\n\n`);
      if (event === "done") {
        clearInterval(heartbeat);
        res.end();
      }
    };
    // Keeps idle proxies from closing the stream between milestones — a
    // heavy page can sit in one phase for half a minute.
    const heartbeat = setInterval(() => res.write(": tick\n\n"), 15_000);
    heartbeat.unref();

    const unsubscribe = subscribeProgress(id, send);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post("/api/scan", async (request, reply) => {
    const parsedBody = scanBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      // Zod's flattened errors quote parts of the input, and the input may
      // contain a password. Echo the detail only when no credentials were
      // sent; otherwise say nothing beyond "invalid".
      const hasAuth =
        typeof request.body === "object" && request.body !== null && "auth" in request.body;
      return reply.status(400).send({
        error: "Invalid request body",
        ...(hasAuth ? {} : { details: parsedBody.error.flatten() }),
      });
    }

    // Where the memory goes, logged around every scan.
    //
    // "Target crashed" is Chromium's renderer dying, and that is a different
    // process from this one. Without both numbers there is no way to tell
    // whether trimming what Node holds — screenshots, mostly — could help at
    // all, or whether every byte that matters belongs to the browser. Three
    // changes have already been aimed at this crash on a hypothesis; this is
    // so the fourth does not have to be.
    const memBefore = await memorySnapshot();
    const peakTracker = trackPeakMemory();

    const progressId = parsedBody.data.progressId;

    let report: AccessibilityReport;
    try {
      // One pipeline, shared with the crawler. It used to be duplicated here,
      // and the copies drifted: fixes landed in one and silently missed the
      // other, which is exactly how a scan and a crawl of the same page ended
      // up disagreeing. HTTP concerns stay in this route; analysis does not.
      report = await scanUrlToReport(
        parsedBody.data.url,
        parsedBody.data.includeAiReview,
        parsedBody.data.auth,
        true,
        parsedBody.data.language,
        false,
        progressId ? (id) => publishProgress(progressId, id) : undefined
      );
    } catch (err) {
      // Every branch of this used to live here, and the crawler had its own
      // much poorer copy. One classifier now serves both, so the two can no
      // longer disagree about what a failure means.
      logger.info(
        {
          url: parsedBody.data.url,
          before: memBefore,
          peak: await peakTracker.stop(),
          atFailure: await memorySnapshot(),
        },
        "Memory around a failed scan"
      );
      if (progressId) finishProgress(progressId);
      const failure = describeScanFailure(err);
      if (failure.logLevel === "warn") {
        logger.warn({ err, url: parsedBody.data.url }, "Scan failed");
      } else {
        logger.info({ url: parsedBody.data.url }, failure.message);
      }
      return reply.status(failure.status).send({
        error: failure.message,
        ...(failure.blocked ? { blocked: true } : {}),
        ...(failure.timedOut ? { timedOut: true } : {}),
        // Only on a genuine unknown, and only server-side detail that is safe
        // to show: the classified cases already say everything useful.
        ...(failure.status === 502
          ? { details: err instanceof Error ? err.message : String(err) }
          : {}),
      });
    }

    // The report is in hand; the last milestone and the stream's close go
    // out before the (much larger) JSON body starts uploading.
    if (progressId) finishProgress(progressId);

    logger.info(
      {
        url: parsedBody.data.url,
        before: memBefore,
        peak: await peakTracker.stop(),
        after: await memorySnapshot(),
      },
      "Memory around a completed scan"
    );
    // Saved only for a caller who identified themselves. Anonymous scanning
    // is the default and is unchanged: no key, no row, no behaviour
    // difference. A storage failure never costs the caller their report —
    // the scan is the product, history is an addition to it.
    let savedAs: string | null = null;
    // The answers this account has already given about this site. They are
    // what lets the conformance report be completed rather than handed over
    // full of blanks: a scan can evidence a failure and nothing else, so
    // every "Supports" in that document has to come from a person.
    let verdicts: ReportVerdict[] = [];
    const account = accountForKey(bearerFrom(request.headers.authorization));
    if (account) {
      try {
        savedAs = saveScan(account.id, report);
      } catch (err) {
        logger.warn({ err, url: report.url }, "scan completed but could not be saved");
      }
      try {
        verdicts = verdictsForSite(account.id, report.url).map((v) => ({
          criterion: v.criterion,
          status: v.status,
          note: v.note,
          decidedBy: v.decidedBy,
          decidedAt: v.decidedAt,
        }));
      } catch (err) {
        logger.warn({ err, url: report.url }, "could not read verdicts for this site");
      }
    }
    // The owner's triage, on each finding it names. Attached here and not
    // in the pipeline: the pipeline measures, and what an owner decided
    // about a measurement is a different kind of fact.
    let findings = report.findings;
    if (account) {
      try {
        const states = findingStates(account.id, report.url);
        if (states.size) {
          findings = report.findings.map((f) => {
            const d = f.fingerprint ? states.get(f.fingerprint) : undefined;
            return d ? { ...f, triage: { state: d.state, note: d.note, decidedBy: d.decidedBy, decidedAt: d.decidedAt } } : f;
          });
        }
      } catch (err) {
        logger.warn({ err, url: report.url }, "could not read triage for this site");
      }
    }
    return reply.send({
      ...report,
      findings,
      ...(savedAs ? { savedAs } : {}),
      ...(verdicts.length ? { verdicts } : {}),
    });
  });
}
