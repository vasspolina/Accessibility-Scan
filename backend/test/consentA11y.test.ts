import { describe, it, expect } from "vitest";
import {
  evaluateConsentA11y,
  consentA11yUndecided,
} from "../src/services/consentA11y/evaluateConsentA11y.js";
import { dropBannerShadowedAriaHiddenFocus } from "../src/services/merge/mergeFindings.js";
import type { DarkPatternSignals } from "../src/services/darkPatterns/analyzeDarkPatterns.js";
import type { AccessibilityFinding } from "../src/types/report.js";

/* Every scenario here is a real site's measured shape from the EU consent
   sweep of 18 August 2026 — the fixture values are the sweep's numbers. */

function signals(
  a11y: Partial<NonNullable<DarkPatternSignals["consentA11y"]>> = {},
  banner: Partial<NonNullable<DarkPatternSignals["consentBanner"]>> = {}
): DarkPatternSignals {
  return {
    consentBanner: {
      selector: "#consent",
      snippet: "<div id=consent>",
      acceptControls: [{ selector: "#a", text: "Accept all", prominent: true }],
      rejectControls: [],
      manageControls: [],
      ...banner,
    },
    consentA11y: {
      role: null,
      accessibleName: false,
      bgHiddenPct: 0,
      sampledChars: 10000,
      focusInBanner: false,
      ...a11y,
    },
    confirmshaming: [],
    preCheckedOptIns: [],
    urgencyClaims: [],
  };
}

describe("consent banner screen-reader checks", () => {
  it("flags the banner that hides the page while focus never enters it (booking.com shape)", () => {
    const s = signals({ bgHiddenPct: 98, sampledChars: 11138, tabsSampled: 8, tabsInBanner: 0 });
    const found = evaluateConsentA11y(s);
    expect(found).toHaveLength(1);
    expect(found[0].ruleId).toBe("consent-blocks-reader");
    expect(found[0].category).toBe("accessibility");
    expect(found[0].wcagLevel).toBe("A");
    expect(found[0].severity).toBe("critical");
    // one fault, one card: the undecided rows stand down for this banner
    expect(consentA11yUndecided(s)).toHaveLength(0);
  });

  it("stays silent for a correct modal: page hidden but focus moved in (orange.fr shape)", () => {
    const s = signals({
      role: "dialog",
      accessibleName: true,
      bgHiddenPct: 96,
      focusInBanner: true,
      tabsSampled: 8,
      tabsInBanner: 8,
    });
    expect(evaluateConsentA11y(s)).toHaveLength(0);
    expect(consentA11yUndecided(s)).toHaveLength(0);
  });

  it("still fires when the tab probe never ran, on initial focus alone", () => {
    const s = signals({ bgHiddenPct: 98 }); // tabsSampled undefined
    expect(evaluateConsentA11y(s)).toHaveLength(1);
  });

  it("does not call a sparse page 'hidden': the sample floor holds", () => {
    const s = signals({ bgHiddenPct: 90, sampledChars: 120, tabsSampled: 8, tabsInBanner: 0 });
    expect(evaluateConsentA11y(s)).toHaveLength(0);
  });

  it("sends the unnamed, never-focused layer to the undecided ledger (lemonde shape)", () => {
    const s = signals({ bgHiddenPct: 0, tabsSampled: 8, tabsInBanner: 0 });
    expect(evaluateConsentA11y(s)).toHaveLength(0);
    const rows = consentA11yUndecided(s);
    expect(rows).toHaveLength(1);
    expect(rows[0].ruleId).toBe("consent-layer-unheralded");
  });

  it("sends the nameless focus trap to the undecided ledger (ryanair shape)", () => {
    const s = signals({ bgHiddenPct: 0, tabsSampled: 8, tabsInBanner: 8 });
    const rows = consentA11yUndecided(s);
    expect(rows).toHaveLength(1);
    expect(rows[0].ruleId).toBe("consent-trap-unnamed");
  });

  it("says nothing about a layer that names itself, wherever focus goes", () => {
    const s = signals({ role: "dialog", accessibleName: true, tabsSampled: 8, tabsInBanner: 0 });
    expect(evaluateConsentA11y(s)).toHaveLength(0);
    expect(consentA11yUndecided(s)).toHaveLength(0);
  });

  it("says nothing about an iframe banner it could not probe (Sourcepoint shape)", () => {
    const s = signals({ bgHiddenPct: 98 }, { frameUrl: "https://cmp.example/msg" });
    expect(evaluateConsentA11y(s)).toHaveLength(0);
    expect(consentA11yUndecided(s)).toHaveLength(0);
  });
});

describe("one fault one card: aria-hidden-focus yields to consent-blocks-reader", () => {
  const f = (ruleId: string): AccessibilityFinding => ({
    id: ruleId,
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "x",
    description: "d",
    suggestedFix: "s",
    ruleId,
  });

  it("drops the per-element echoes when the banner finding owns the fault", () => {
    const out = dropBannerShadowedAriaHiddenFocus([
      f("consent-blocks-reader"),
      f("aria-hidden-focus"),
      f("image-alt"),
    ]);
    expect(out.map((x) => x.ruleId)).toEqual(["consent-blocks-reader", "image-alt"]);
  });

  it("leaves aria-hidden-focus alone when no banner finding exists", () => {
    const out = dropBannerShadowedAriaHiddenFocus([f("aria-hidden-focus"), f("image-alt")]);
    expect(out).toHaveLength(2);
  });
});