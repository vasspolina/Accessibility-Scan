import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { renderAndScan } from "../src/services/render/renderPage.js";
import { axeToFindings } from "../src/services/merge/mergeFindings.js";
import { evaluateTypography } from "../src/services/typography/analyzeTypography.js";
import { evaluateMotion } from "../src/services/motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "../src/services/keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "../src/services/components/analyzeComponents.js";
import { evaluateDialogs } from "../src/services/dialog/analyzeDialogs.js";
import { evaluateMobile } from "../src/services/mobile/analyzeMobile.js";
import { evaluateDarkPatterns } from "../src/services/darkPatterns/analyzeDarkPatterns.js";
import { evaluateTextResize } from "../src/services/textResize/analyzeTextResize.js";
import type { AccessibilityFinding } from "../src/types/report.js";

// The two QA fixtures, run as a test rather than by hand.
//
// Every other test here checks a function in isolation. These check that the
// whole detection pipeline still finds a written-down list of defects in a
// page built to contain them, and still says nothing about a section built to
// be correct. That second half is the part no amount of testing against real
// sites can give you: on a real site you cannot tell a false positive from a
// finding you had not thought of.
//
// Read over file:// so this needs no network and no deployed service. The SSRF
// guard refuses localhost over HTTP and is right to; a file URL never opens a
// socket, so nothing is weakened to make this run.

async function scanFixture(name: string): Promise<AccessibilityFinding[]> {
  const url = "file://" + path.resolve(`public/${name}`);
  const r = await renderAndScan(url, undefined, 90_000);
  const findings = axeToFindings(r.axe);
  findings.push(...evaluateTypography(r.typographyBlocks));
  findings.push(
    ...evaluateMotion(r.domSignals.animatedElements, r.domSignals.respectsReducedMotion, new Set())
  );
  findings.push(...evaluateKeyboardNav(r.keyboardNav));
  findings.push(...evaluateComponents(r.domSignals));
  findings.push(...evaluateDialogs(r.domSignals.dialogs));
  findings.push(...evaluateMobile(r.mobileSignals));
  findings.push(...evaluateDarkPatterns(r.darkPatternSignals));
  findings.push(...evaluateTextResize(r.textResizeSignals));
  return findings;
}

describe("qa-fixture.html: the rules axe owns", () => {
  let rules: Set<string>;
  let findings: AccessibilityFinding[];
  beforeAll(async () => {
    findings = await scanFixture("qa-fixture.html");
    rules = new Set(findings.map((f) => f.ruleId).filter(Boolean) as string[]);
  }, 180_000);

  const expected: Array<[string, string[]]> = [
    ["image with no alt", ["image-alt"]],
    ["button with no accessible name", ["button-name"]],
    ["link with no text", ["link-name"]],
    ["link text that says nothing", ["link-text-vague"]],
    ["input with no label", ["label"]],
    ["text far below 4.5:1", ["color-contrast"]],
    ["heading level skipped", ["heading-order"]],
    ["list items outside a list", ["listitem", "list"]],
    ["no lang on <html>", ["html-has-lang"]],
    ["no page title", ["document-title"]],
    ["undersized targets packed together", ["mobile-tap-target"]],
  ];

  for (const [what, ids] of expected) {
    it(`finds the ${what}`, () => {
      expect(ids.some((id) => rules.has(id)), `expected one of ${ids.join(", ")}`).toBe(true);
    });
  }

  // The control section is deliberately correct. Anything flagged inside it is
  // a false positive, and this is the only way to see one.
  it("says nothing about the section built to be correct", () => {
    const controlSelectors = ["#ok-input", "main > button", "main > a", "main > img", "main > ul"];
    const offenders = findings.filter((f) =>
      controlSelectors.some((c) => (f.selector ?? "").includes(c))
    );
    expect(offenders.map((f) => `${f.ruleId} on ${f.selector}`)).toEqual([]);
  });
});

describe("qa-layers.html: the layers written for this project", () => {
  let rules: Set<string>;
  let findings: Awaited<ReturnType<typeof scanFixture>>;
  beforeAll(async () => {
    findings = await scanFixture("qa-layers.html");
    rules = new Set(findings.map((f) => f.ruleId).filter(Boolean) as string[]);
  }, 180_000);

  const expected = [
    "motion-infinite-no-reduced-motion",
    "typo-leading-tight",
    "typo-negative-letterspacing",
    "typo-font-size-small",
    "typo-allcaps-block",
    "mobile-horizontal-scroll",
    "keyboard-no-visible-focus",
    "dark-consent-asymmetry",
    "dark-preselected-optin",
    "dark-confirmshaming",
    "dark-fake-urgency",
    "component-required-cue",
    "component-submit-clarity",
    "component-skip-link",
    "keyboard-mouse-only",
  ];

  for (const rule of expected) {
    it(`still fires ${rule}`, () => {
      expect(rules.has(rule)).toBe(true);
    });
  }

  // The mouse-only check is the one most able to cry wolf: almost every
  // element on a modern page has a click handler somewhere above it, and the
  // rule is only useful if it can tell the two genuine faults in the fixture
  // apart from the five correct patterns sitting beside them.
  it("finds both mouse-only controls and neither of the correct ones", () => {
    const flagged = findings
      .filter((f) => f.ruleId === "keyboard-mouse-only")
      .map((f) => f.selector);

    expect(flagged).toHaveLength(2);
    expect(flagged.join(" ")).toContain("div");
    expect(flagged.join(" ")).toContain("span");

    // A real button, a div with role+tabindex, a wrapper around a link, a span
    // inside a link, and a full-page backdrop. Each is reachable or
    // dismissable by keyboard, so reporting any would be a false alarm. Each
    // also covers a different filter: removing any one of them from the code
    // makes this test fail, which is how they were checked.
    for (const correct of ["real-button", "real-custom-button", "click-wrapper", "card-inner", "backdrop"]) {
      expect(flagged.join(" "), `${correct} was wrongly reported`).not.toContain(correct);
    }
  });
});
