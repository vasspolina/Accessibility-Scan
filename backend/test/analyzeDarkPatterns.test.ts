import { describe, it, expect } from "vitest";
import {
  evaluateDarkPatterns,
  type DarkPatternSignals,
  type ChoiceControl,
} from "../src/services/darkPatterns/analyzeDarkPatterns.js";

function control(text: string, prominent = false): ChoiceControl {
  return { selector: "button", text, prominent };
}

function signals(overrides: Partial<DarkPatternSignals> = {}): DarkPatternSignals {
  return {
    consentBanner: null,
    confirmshaming: [],
    preCheckedOptIns: [],
    urgencyClaims: [],
    ...overrides,
  };
}

function rulesOf(findings: ReturnType<typeof evaluateDarkPatterns>): string[] {
  return findings.map((f) => f.ruleId ?? "");
}

describe("evaluateDarkPatterns — consent banner", () => {
  it("flags a banner that offers accept but no way to refuse", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#cookie",
          snippet: "<div id=cookie>",
          acceptControls: [control("Accept all", true)],
          rejectControls: [],
          manageControls: [],
        },
      })
    );
    expect(rulesOf(findings)).toContain("dark-consent-no-reject");
  });

  it("still flags when refusing is only possible via a settings screen", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#cookie",
          snippet: "",
          acceptControls: [control("Accept all", true)],
          rejectControls: [],
          manageControls: [control("Manage preferences")],
        },
      })
    );
    expect(rulesOf(findings)).toContain("dark-consent-no-reject");
    expect(findings[0].description).toMatch(/settings screen/i);
  });

  it("flags visual asymmetry when accept is a button and reject is plain text", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#cookie",
          snippet: "",
          acceptControls: [control("Accept all", true)],
          rejectControls: [control("Reject all", false)],
          manageControls: [],
        },
      })
    );
    expect(rulesOf(findings)).toContain("dark-consent-asymmetry");
  });

  it("does not flag a banner where both choices are equally prominent", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#cookie",
          snippet: "",
          acceptControls: [control("Accept all", true)],
          rejectControls: [control("Reject all", true)],
          manageControls: [],
        },
      })
    );
    expect(findings).toEqual([]);
  });

  it("ignores a banner with no accept control at all", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#cookie",
          snippet: "",
          acceptControls: [],
          rejectControls: [],
          manageControls: [],
        },
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("evaluateDarkPatterns — pre-ticked opt-ins", () => {
  it("flags each pre-ticked marketing opt-in", () => {
    const findings = evaluateDarkPatterns(
      signals({
        preCheckedOptIns: [
          { selector: "#news", snippet: "", label: "Subscribe me to the newsletter" },
          { selector: "#partners", snippet: "", label: "Share my details with partners" },
        ],
      })
    );
    expect(rulesOf(findings)).toEqual(["dark-preselected-optin", "dark-preselected-optin"]);
    expect(findings[0].severity).toBe("serious");
  });
});

describe("evaluateDarkPatterns — confirmshaming", () => {
  it("flags a guilt-tripping decline", () => {
    const findings = evaluateDarkPatterns(
      signals({
        confirmshaming: [
          { selector: "a", snippet: "", text: "No thanks, I don't want to save money" },
        ],
      })
    );
    expect(rulesOf(findings)).toContain("dark-confirmshaming");
    expect(findings[0].description).toMatch(/confirmshaming/i);
  });
});

describe("evaluateDarkPatterns — urgency and scarcity", () => {
  it("separates scarcity from time pressure", () => {
    const findings = evaluateDarkPatterns(
      signals({
        urgencyClaims: [
          { selector: "p", snippet: "", text: "Only 2 left in stock", kind: "scarcity" },
          { selector: "span", snippet: "", text: "Offer ends in 05:23", kind: "urgency" },
        ],
      })
    );
    expect(rulesOf(findings)).toEqual(["dark-fake-scarcity", "dark-fake-urgency"]);
  });

  it("reports urgency as minor — a prompt to verify, not an accusation", () => {
    const findings = evaluateDarkPatterns(
      signals({
        urgencyClaims: [{ selector: "p", snippet: "", text: "Hurry, limited time", kind: "urgency" }],
      })
    );
    expect(findings[0].severity).toBe("minor");
  });
});

describe("evaluateDarkPatterns — general contract", () => {
  it("returns nothing for a clean page", () => {
    expect(evaluateDarkPatterns(signals())).toEqual([]);
  });

  it("reports every finding as dark-pattern with a help link and no WCAG criterion", () => {
    const findings = evaluateDarkPatterns(
      signals({
        consentBanner: {
          selector: "#c",
          snippet: "",
          acceptControls: [control("Accept", true)],
          rejectControls: [],
          manageControls: [],
        },
        confirmshaming: [{ selector: "a", snippet: "", text: "No, I don't want to be smart" }],
        preCheckedOptIns: [{ selector: "#n", snippet: "", label: "newsletter" }],
        urgencyClaims: [{ selector: "p", snippet: "", text: "Only 1 left", kind: "scarcity" }],
      })
    );
    expect(findings).toHaveLength(4);
    for (const f of findings) {
      expect(f.category).toBe("dark-pattern");
      expect(f.source).toBe("automated");
      expect(f.helpUrl).toBeTruthy();
      expect(f.wcagCriterion).toBeUndefined();
    }
  });
});
