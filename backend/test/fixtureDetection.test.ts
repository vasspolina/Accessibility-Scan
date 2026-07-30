import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { renderAndScan, captureSelectorsFresh } from "../src/services/render/renderPage.js";
import { axeToFindings } from "../src/services/merge/mergeFindings.js";
import { evaluateTypography } from "../src/services/typography/analyzeTypography.js";
import { evaluateMotion } from "../src/services/motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "../src/services/keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "../src/services/components/analyzeComponents.js";
import { evaluateDialogs } from "../src/services/dialog/analyzeDialogs.js";
import { evaluateForcedColors } from "../src/services/forcedColors/analyzeForcedColors.js";
import { evaluateReadingOrder } from "../src/services/readingOrder/analyzeReadingOrder.js";
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
    ...evaluateMotion(
      r.domSignals.animatedElements,
      r.domSignals.respectsReducedMotion,
      new Set(),
      r.userPreferences
    )
  );
  findings.push(...evaluateKeyboardNav(r.keyboardNav));
  findings.push(...evaluateComponents(r.domSignals));
  findings.push(...evaluateDialogs(r.domSignals.dialogs, r.dialogKeyboard));
  findings.push(...evaluateForcedColors(r.keyboardNav.stops, r.userPreferences));
  findings.push(...evaluateReadingOrder(r.readingOrder));
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
    "keyboard-faint-focus",
  ];

  for (const rule of expected) {
    it(`still fires ${rule}`, () => {
      expect(rules.has(rule)).toBe(true);
    });
  }

  // The browser's own focus ring is exempt from the contrast requirement —
  // 1.4.11 says so outright. The fixture leaves two elements with the default
  // ring, and on this page Chrome draws it as rgb(0, 95, 204), which against
  // the blue Accept button behind it is close to 1:1. If the exemption were
  // dropped those would be reported, so a quiet result here is load-bearing.
  it("reports the faint ring once, and never the browser's own", () => {
    const faint = findings.filter((f) => f.ruleId === "keyboard-faint-focus");
    expect(faint).toHaveLength(1);
    expect(faint[0].wcagCriterion).toBe("1.4.11");
    // Two stops carry the pale ring; the strong and default ones must not be
    // counted in with them.
    expect(faint[0].description).toContain("2 of");
  });

  // Urgency wording that names a date is a statement of fact, not a dark
  // pattern. MoMA lists closing exhibitions as "Last chance — Through Aug 9"
  // and was reported three times for manufacturing urgency about a genuine
  // published closing date. Accusing a site of a practice regulators pursue
  // is not a small thing to get wrong.
  it("does not call a dated deadline a dark pattern", () => {
    const flagged = findings
      .filter((f) => (f.ruleId ?? "").startsWith("dark-fake"))
      .map((f) => f.selector ?? "")
      .join(" ");
    expect(flagged).not.toContain("#real-deadline");
    expect(flagged).not.toContain("#dated-offer");
    // But a date says nothing about whether a stock count is real, so the
    // exemption must not reach quantity claims.
    expect(flagged).toContain("#dated-stock");
  });

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

// The dialog keyboard probe drives a real Escape key and real Tab presses at
// a modal that is open on arrival, so it can only be tested end to end. Two
// fixtures, because a rule that fires on every modal it sees would pass a
// test that only ever showed it a broken one.
describe("the dialog keyboard probe", () => {
  // Screenshots are attached by the scan pipeline, not by the evaluators, so
  // this checks the layer that actually captures: whether the render pass
  // could resolve the dialog's selector and photograph it.
  //
  // The regression it guards is quiet and total. An id starting with a digit
  // is legal HTML but an invalid CSS identifier — "#6a67b23825139" is a
  // syntax error, so every querySelector for it throws. Generated consent
  // markup produces such ids routinely. Both capture passes caught the error
  // and moved on, so the finding simply arrived with nothing to show.
  it("photographs a dialog whose id is not a valid CSS identifier", async () => {
    const url = "file://" + path.resolve("public/qa-dialog-trap.html");
    const r = await renderAndScan(url, undefined, 90_000);
    const selector = r.domSignals.dialogs[0]?.selector;
    expect(selector, "no dialog was detected at all").toBeTruthy();
    expect(selector).toContain("\\");
    expect(
      r.elementScreenshots[selector!],
      `no screenshot captured for ${selector}`
    ).toBeTruthy();
  }, 180_000);

  it("says nothing at all about a modal that behaves", async () => {
    const findings = await scanFixture("qa-dialog-good.html");
    const dialogFindings = findings.filter((f) => (f.ruleId ?? "").startsWith("dialog-"));
    expect(dialogFindings.map((f) => `${f.ruleId} on ${f.selector}`)).toEqual([]);
  }, 180_000);

  it("proves the trap rather than inferring it", async () => {
    const findings = await scanFixture("qa-dialog-trap.html");
    const trap = findings.find((f) => f.ruleId === "dialog-keyboard-trap");
    expect(trap).toBeDefined();
    expect(trap!.severity).toBe("critical");
    expect(trap!.wcagCriterion).toBe("2.1.2");
    // The lesser complaints about the same element stay suppressed.
    expect(findings.find((f) => f.ruleId === "dialog-focus-not-moved")).toBeUndefined();

    // The selector must be valid CSS. This dialog's id starts with a digit,
    // which is legal HTML and an invalid CSS identifier, so it has to arrive
    // escaped or nothing downstream can resolve it.
    expect(trap!.selector).toContain("\\");
  }, 180_000);
});

// Forced colours and reduced motion are only meaningful end to end: both are
// answered by the browser under an emulated user preference, not by anything
// readable in the source.
describe("qa-preferences.html: display preferences", () => {
  let findings: AccessibilityFinding[];
  beforeAll(async () => {
    findings = await scanFixture("qa-preferences.html");
  }, 180_000);

  const ruleOn = (id: string) => findings.filter((f) => f.ruleId === id).map((f) => f.selector);

  it("finds focus rings that disappear in forced colours", () => {
    expect(ruleOn("forced-colors-focus-lost")).toHaveLength(1);
  });

  it("finds the button that is nothing but a background image", () => {
    expect(ruleOn("forced-colors-icon-lost")).toEqual(["#css-icon"]);
  });

  it("finds the animation that ignores the preference, and only that one", () => {
    const flagged = ruleOn("motion-infinite-no-reduced-motion");
    expect(flagged).toHaveLength(1);
    // .calms answers the preference and sits right beside .spins; reporting
    // it would mean the probe is reading the stylesheet rather than the page.
    expect(flagged[0]).toContain("div:nth-of-type(1)");
  });

  it("says nothing about any of the five correct patterns", () => {
    // An outline on a button and on a link, the transparent-outline idiom, a
    // real <img> icon, and a button with text. Each is a pattern that looks
    // like a failure until the rule is right.
    const flagged = findings
      .filter((f) => (f.ruleId ?? "").startsWith("forced-colors-"))
      .map((f) => f.selector ?? "")
      .join(" ");
    expect(flagged).not.toContain("#real-icon");
    expect(flagged).not.toContain("#text-button");
    // The stretched-link overlay: empty, but with no background image to
    // lose. Six of these were wrongly reported on a real site before the
    // check compared normal rendering against forced colours.
    expect(flagged).not.toContain("#stretched-link");
    // The outline controls are buttons 3 and 4 plus the link in section 1.
    expect(flagged).not.toContain("button:nth-of-type(3)");
    expect(flagged).not.toContain("button:nth-of-type(4)");
    expect(flagged).not.toContain("section:nth-of-type(1) > a");
  });
});

// Visual order versus source order. Only meaningful end to end: the fault is
// the disagreement between where a control sits and where the Tab key reaches
// it, and neither is readable from the source alone.
describe("qa-reading-order.html: visual versus source order", () => {
  let findings: AccessibilityFinding[];
  beforeAll(async () => {
    findings = await scanFixture("qa-reading-order.html");
  }, 180_000);

  it("finds both reordered rows and no others", () => {
    const flagged = findings.filter((f) => f.ruleId === "reading-order-mismatch");
    expect(flagged).toHaveLength(2);
    const text = flagged.map((f) => f.description).join(" ");
    expect(text).toContain("Cancel");
    expect(text).toContain("Three");
  });

  it("names the criterion it can actually prove", () => {
    const f = findings.find((x) => x.ruleId === "reading-order-mismatch");
    expect(f!.wcagCriterion).toBe("2.4.3");
    expect(f!.wcagLevel).toBe("A");
  });

  // Five layouts an earlier geometry-first version of this check called
  // broken. Each is correct, and each pins down a constraint: gov.uk's
  // single-focusable card, moma.org's and kunsthallebern.ch's columns, and a
  // dense grid whose second item sits right of its third only because the
  // third is on the next line. Removing either constraint from the probe
  // makes this test fail, which is how they were checked.
  it("says nothing about the five correct layouts beside them", () => {
    const flagged = findings
      .filter((f) => f.ruleId === "reading-order-mismatch")
      .map((f) => f.selector ?? "")
      .join(" ");
    // Everything correct lives in section 2; both faults are in section 1.
    expect(flagged).not.toContain("section:nth-of-type(2)");
  });
});

describe("qa-consent-de.html: a consent banner in a language we do not read", () => {
  let findings: AccessibilityFinding[];
  beforeAll(async () => {
    findings = await scanFixture("qa-consent-de.html");
  }, 120_000);

  // The banner offers "Alle auswählen" and no way to refuse. That is the
  // asymmetry rule, and it has to fire on a German page exactly as it does
  // on an English one — the product is sold on GDPR consent.
  it("finds the missing refusal even though nothing on the page is in English", () => {
    expect(findings.map((f) => f.ruleId)).toContain("dark-consent-no-reject");
  });

  // The regression this fixture exists for. The buttons that decide anything
  // sit on the outer container; the inner one carries consent wording and its
  // own controls but no choice. Preferring the innermost block used to throw
  // away the only element that could have been judged, and the page came back
  // clean.
  it("judges the container holding the choice, not the deepest one holding text", () => {
    expect(findings.some((f) => f.ruleId.startsWith("dark-"))).toBe(true);
  });
});

describe("qa-consent-pl.html: a banner that offers a real choice", () => {
  let findings: AccessibilityFinding[];
  beforeAll(async () => {
    findings = await scanFixture("qa-consent-pl.html");
  }, 120_000);

  // The half no amount of testing against real sites gives you. Accept and
  // refuse are both there, both the same size, both the same weight. Saying
  // nothing is the correct answer, and it has to stay correct in an alphabet
  // JavaScript's \b does not handle: "Odrzuć" ends in a character \b does not
  // count as part of a word, so under ASCII boundaries the refusal vanishes,
  // the banner reads as accept-only, and a page with nothing wrong with it
  // gets reported for the commonest dark pattern there is.
  it("says nothing about a refusal spelled outside the ASCII alphabet", () => {
    expect(findings.filter((f) => f.ruleId?.startsWith("dark-"))).toEqual([]);
  });
});

describe("qa-consent-frame.html: a banner served from its own document", () => {
  // Every consent management platform in wide use -- Sourcepoint, OneTrust,
  // Didomi -- serves its banner in an iframe. Two things have to hold: the
  // banner is found there at all, and we remember it was found there. Without
  // the second, the selector is a path through the frame's document that gets
  // resolved against the host page, where it means something else entirely.
  it("finds the banner in the frame and records where it was found", async () => {
    const url = "file://" + path.resolve("public/qa-consent-frame.html");
    const r = await renderAndScan(url, undefined, 90_000);
    const banner = r.darkPatternSignals.consentBanner;
    expect(banner).not.toBeNull();
    expect(banner?.frameUrl).toContain("qa-consent-frame-inner.html");
    expect(evaluateDarkPatterns(r.darkPatternSignals).map((f) => f.ruleId)).toContain(
      "dark-consent-no-reject"
    );
  }, 120_000);

  // The decoy divs in the host page match the same path the frame produced.
  // If the banner is ever reported without its frame recorded, that path will
  // quietly resolve to one of these.
  it("does not mistake the host page's own markup for the banner", async () => {
    const url = "file://" + path.resolve("public/qa-consent-frame.html");
    const r = await renderAndScan(url, undefined, 90_000);
    expect(r.darkPatternSignals.consentBanner?.snippet ?? "").not.toContain(
      "Nothing to do with consent"
    );
  }, 120_000);
});

describe("qa-shadow-keyboard.html: controls inside a shadow root", () => {
  // document.activeElement stops at a shadow host, so a walk that reads it
  // sees the same element on every Tab press. This project's own widget
  // renders into a shadow root and the scan reported a critical keyboard trap
  // and "1 of 1 stops show no focus outline" — both false, on a component that
  // traps nothing and rings every control. Every site built from web
  // components would have received the same two findings.
  it("walks into the shadow root instead of stopping at its host", async () => {
    const url = "file://" + path.resolve("public/qa-shadow-keyboard.html");
    const r = await renderAndScan(url, undefined, 90_000);
    // Five controls live in the shadow root, plus the link after it.
    expect(r.keyboardNav.stops.length).toBeGreaterThan(3);
    const hosts = r.keyboardNav.stops.filter((s) => /my-panel/i.test(s.selector ?? ""));
    expect(hosts.length, "every stop reported as the host element").toBeLessThan(
      r.keyboardNav.stops.length
    );
  }, 120_000);

  it("accuses a well-behaved component of nothing", async () => {
    const findings = await scanFixture("qa-shadow-keyboard.html");
    const ids = findings.map((f) => f.ruleId);
    expect(ids).not.toContain("keyboard-focus-trap");
    expect(ids).not.toContain("keyboard-no-visible-focus");
  }, 120_000);
});

describe("qa-shadow-violations.html: an axe violation inside a shadow root", () => {
  // axe reports a shadow element with a nested-array target: [host, inner].
  // Joining the outer array with a space coerced that inner array with a
  // comma, and a comma makes a CSS selector LIST — "the host, or the inner
  // element". The capture photographed the component's host, the report
  // displayed a garbled selector, and dedup keyed on the wrong string.
  it("writes a piercing selector, not a selector list", async () => {
    const findings = await scanFixture("qa-shadow-violations.html");
    const alt = findings.find((f) => f.ruleId === "image-alt");
    expect(alt, "axe did not pierce the shadow root").toBeDefined();
    expect(alt!.selector).not.toContain(",");
    expect(alt!.selector).toMatch(/my-gallery/);
    expect(alt!.selector).toMatch(/img/);
  }, 120_000);

  // Playwright's CSS engine pierces open shadow roots with plain descendant
  // selectors, so the flattened path must actually photograph the image.
  it("can photograph the element the selector names", async () => {
    const findings = await scanFixture("qa-shadow-violations.html");
    const alt = findings.find((f) => f.ruleId === "image-alt");
    const url = "file://" + path.resolve("public/qa-shadow-violations.html");
    const result = await captureSelectorsFresh(url, [alt!.selector], () => true);
    expect(
      result.shots[alt!.selector],
      `no shot; reason: ${result.unpicturable[alt!.selector] ?? "none recorded"}`
    ).toBeTruthy();
  }, 120_000);
});
