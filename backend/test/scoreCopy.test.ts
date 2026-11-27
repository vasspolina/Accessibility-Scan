import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * What the score counts is said in two places that ship separately: the
 * widget's SCORE_POINTS, on screen, and the emailed report, written here.
 * Both once said the score counts "what an automated scan can prove", while
 * AI-review findings tied to a WCAG criterion counted too; since 22 Nov 2026
 * they do not (scoring.ts). These hold the two to each other and to that.
 */

const widget = readFileSync(new URL("../../widget-business/src/components/ScoreGauge.tsx", import.meta.url), "utf8");
const mail = readFileSync(new URL("../src/services/mail/sendReport.ts", import.meta.url), "utf8");

const block = /export const SCORE_POINTS = \[([\s\S]*?)\];/.exec(widget)?.[1] ?? "";
const points = [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);

describe("how the score works", () => {
  it("is read from the widget's own list", () => {
    // A probe that finds nothing passes every check below.
    expect(points.length).toBeGreaterThanOrEqual(3);
  });

  it("is said in the email word for word", () => {
    for (const point of points) expect(mail).toContain(`"- ${point}"`);
  });

  it("is headed the same way on screen and in the email", () => {
    expect(widget).toContain('t("How the score works")');
    expect(mail).toContain('"How the score works:"');
  });

  it("says each severity can only lower it so far", () => {
    expect(points.some((p) => /maximum deduction/.test(p))).toBe(true);
  });

  it("never again claims the score is only what a scan can prove", () => {
    expect(widget).not.toMatch(/\bcan prove\b/);
    expect(widget).not.toMatch(/\bscan proves\b/);
    expect(mail).not.toMatch(/\bcan prove\b/);
  });

  // Since 22 Nov 2026 no AI judgement moves the score (scoring.ts), and the
  // copy has to say so rather than the rule it replaced.
  it("says the AI review's findings do not count, and need a person", () => {
    expect(points.find((p) => /excludes/.test(p))).toMatch(/AI findings/);
    expect(points.find((p) => /verify AI findings/.test(p))).toMatch(/person/);
    expect(widget).not.toMatch(/count too when/);
  });
});
