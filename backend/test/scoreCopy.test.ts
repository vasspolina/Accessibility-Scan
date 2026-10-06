import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * What the score counts is said in two places that ship separately: the
 * widget's SCORE_POINTS, on screen, and the emailed report, written here.
 * Both once said the score counts "what an automated scan can prove"; it
 * does not — AI-review findings tied to a WCAG criterion count too
 * (scoring.ts). These hold the two to each other and to that correction.
 */

const widget = readFileSync(new URL("../../widget-business/src/components/ScoreGauge.tsx", import.meta.url), "utf8");
const mail = readFileSync(new URL("../src/services/mail/sendReport.ts", import.meta.url), "utf8");

const block = /export const SCORE_POINTS = \[([\s\S]*?)\];/.exec(widget)?.[1] ?? "";
const points = [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);

describe("what the score counts", () => {
  it("is read from the widget's own list", () => {
    // A probe that finds nothing passes every check below.
    expect(points.length).toBeGreaterThanOrEqual(5);
  });

  it("is said in the email word for word", () => {
    for (const point of points) expect(mail).toContain(`"- ${point}"`);
  });

  it("is headed the same way on screen and in the email", () => {
    expect(widget).toContain('t("What the score counts")');
    expect(mail).toContain('"What the score counts:"');
  });

  it("says each severity can only lower it so far", () => {
    expect(points.some((p) => /limit/.test(p))).toBe(true);
  });

  it("never again claims the score is only what a scan can prove", () => {
    expect(widget).not.toMatch(/\bcan prove\b/);
    expect(widget).not.toMatch(/\bscan proves\b/);
    expect(mail).not.toMatch(/\bcan prove\b/);
  });

  it("says the AI review's findings count, and can be wrong", () => {
    const ai = points.find((p) => /AI review/.test(p));
    expect(ai).toMatch(/count too/);
    expect(ai).toMatch(/can be wrong/);
  });
});
