import { describe, it, expect } from "vitest";
import { dropContradictedConsentClaims } from "../src/services/merge/mergeFindings.js";
import type { AccessibilityFinding } from "../src/types/report.js";

// Equal visual weight on accept/reject is what GDPR Art. 7 and EDPB guidance
// require — it is the fix, not the fault. The model reported the opposite on a
// banner whose buttons matched, and telling an owner to make one stand out
// would walk them into the actual dark pattern.

function aiDarkPattern(text: string): AccessibilityFinding {
  return {
    id: "x",
    source: "ai-review",
    severity: "moderate",
    category: "dark-pattern",
    selector: ".banner",
    title: text,
    description: text,
    suggestedFix: "Make one of them stand out more.",
  };
}

const symmetric = {
  acceptControls: [{ prominent: true }],
  rejectControls: [{ prominent: true }],
};
const bothPlain = {
  acceptControls: [{ prominent: false }],
  rejectControls: [{ prominent: false }],
};
const asymmetric = {
  acceptControls: [{ prominent: true }],
  rejectControls: [{ prominent: false }],
};

describe("dropContradictedConsentClaims", () => {
  const claim = aiDarkPattern("Accept and reject cookie buttons look visually identical");

  it("drops the claim when both buttons are prominent", () => {
    expect(dropContradictedConsentClaims([claim], symmetric)).toEqual([]);
  });

  it("drops it when neither is prominent — equal is equal", () => {
    expect(dropContradictedConsentClaims([claim], bothPlain)).toEqual([]);
  });

  // The real dark pattern. The model is right here and must be left alone.
  it("keeps the claim when accept really is pushed over reject", () => {
    expect(dropContradictedConsentClaims([claim], asymmetric)).toHaveLength(1);
  });

  it("keeps everything when there is no banner to measure", () => {
    expect(dropContradictedConsentClaims([claim], null)).toHaveLength(1);
  });

  it("keeps everything when only one side of the pair was found", () => {
    const acceptOnly = { acceptControls: [{ prominent: true }], rejectControls: [] };
    expect(dropContradictedConsentClaims([claim], acceptOnly)).toHaveLength(1);
  });

  // Narrow on purpose: this silences one specific contradicted claim, not
  // every opinion about consent.
  it("leaves other consent findings alone", () => {
    const other = aiDarkPattern("Cookie banner reappears on every page and blocks reading");
    expect(dropContradictedConsentClaims([other], symmetric)).toHaveLength(1);
  });

  it("leaves a finding that mentions accept but says nothing about styling", () => {
    const other = aiDarkPattern("Accepting also opts you into marketing email, with no separate choice");
    expect(dropContradictedConsentClaims([other], symmetric)).toHaveLength(1);
  });

  it("never touches deterministic findings", () => {
    const deterministic: AccessibilityFinding = {
      ...aiDarkPattern("Accept and reject look identical"),
      source: "automated",
    };
    expect(dropContradictedConsentClaims([deterministic], symmetric)).toHaveLength(1);
  });

  it("never touches accessibility findings", () => {
    const a11y: AccessibilityFinding = {
      ...aiDarkPattern("Accept and reject buttons look identical"),
      category: "accessibility",
    };
    expect(dropContradictedConsentClaims([a11y], symmetric)).toHaveLength(1);
  });

  it("catches the wording the model actually produced", () => {
    const real = aiDarkPattern(
      "Accept and reject cookie buttons look visually identical, but only one is a real choice"
    );
    expect(dropContradictedConsentClaims([real], symmetric)).toEqual([]);
  });
});
