import { afterEach, describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AccessibilityFinding } from "../src/api/scanClient";
import { failureText, pictureNoteText } from "../src/lib/failureText";
import { setLang } from "../src/lib/i18n";

/**
 * Why a scan failed, and why a finding has no picture, in the reader's
 * language. Both used to arrive as the backend's English sentence and were
 * shown as they came, so a German reader met "www.w3.org turned our scanner
 * away" under a German heading.
 */

afterEach(() => setLang("en"));

const finding = (overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding => ({
  id: "f",
  source: "automated",
  severity: "serious",
  category: "accessibility",
  selector: "#el",
  description: "d",
  suggestedFix: "f",
  ...overrides,
});

describe("failureText", () => {
  it("words a refusal from its values, in the reader's language", () => {
    setLang("de");
    const text = failureText("www.w3.org turned our scanner away (HTTP 403). …", {
      code: "refused",
      host: "www.w3.org",
      status: 403,
    });
    expect(text).toMatch(/^www\.w3\.org hat unseren Scanner abgewiesen \(HTTP 403\)\./);
    expect(text).not.toMatch(/turned our scanner away/);
  });

  // The backend's English sentence and the widget's must not drift: an
  // English reader sees the widget's.
  it("matches the backend's English for a refusal", () => {
    const backend = fs.readFileSync(path.resolve(__dirname, "../../backend/src/services/render/renderPage.ts"), "utf8");
    const english = failureText("", { code: "refused", host: "{host}", status: 0 }).replace("HTTP 0", "HTTP ${reason.status}");
    expect(backend).toContain(english.replace("{host}", "${host}"));
  });

  it("never calls a missing page a block", () => {
    setLang("de");
    const text = failureText("There is no page at that address (HTTP 404). …", {
      code: "page-status",
      host: "example.com",
      status: 404,
    });
    expect(text).toMatch(/keine Seite \(HTTP 404\)/);
    expect(text).not.toMatch(/abgewiesen|Schutz/);
  });

  it("translates a sentence with no values in it as it stands", () => {
    setLang("de");
    expect(failureText("Every scanner is busy right now. Please try again in a minute.")).toMatch(/Scanner belegt/);
  });

  it("falls back to the sentence it was given when there is no translation", () => {
    setLang("de");
    expect(failureText("Something nobody wrote down.")).toBe("Something nobody wrote down.");
  });
});

describe("pictureNoteText", () => {
  it("words the note from its reason, in the reader's language", () => {
    setLang("de");
    const text = pictureNoteText(finding({ pictureNote: "No picture: …", pictureReason: "offscreen" }));
    expect(text).toMatch(/^Kein Bild: Das Element liegt außerhalb des Bildschirms/);
  });

  it("says where to look when the element sits in a consent frame", () => {
    setLang("de");
    const text = pictureNoteText(
      finding({ pictureNote: "No picture: …", pictureReason: "no-usable-image", pictureFrame: "consent.example" })
    );
    expect(text).toMatch(/Consent-Frame von consent\.example/);
    expect(text).not.toMatch(/nennen das genaue Element/);
  });

  // A report saved before the reason was sent still shows its note.
  it("keeps the English note on an older report", () => {
    setLang("de");
    expect(pictureNoteText(finding({ pictureNote: "No picture: an old note." }))).toBe("No picture: an old note.");
  });

  // The widget keeps its own English copy of the backend's notes, to look
  // the translation up by. They must stay word for word the same.
  it("matches the backend's English notes", () => {
    const backend = fs.readFileSync(path.resolve(__dirname, "../../backend/src/services/scanPipeline.ts"), "utf8");
    const reasons = ["hidden", "offscreen", "no-usable-image", "too-large", "missing", "not-attempted", "unreachable"] as const;
    for (const reason of reasons) {
      const text = pictureNoteText(finding({ pictureReason: reason }))!;
      expect(backend, reason).toContain(JSON.stringify(text));
    }
  });
});
