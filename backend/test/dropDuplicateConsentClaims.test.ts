import { describe, it, expect } from "vitest";
import { dropDuplicateConsentClaims } from "../src/services/merge/mergeFindings.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function ai(over: Partial<AccessibilityFinding>): AccessibilityFinding {
  return {
    id: "ai-1",
    source: "ai-review",
    severity: "serious",
    category: "dark-pattern",
    selector: "html > body > div",
    description: "",
    suggestedFix: "",
    ...over,
  } as AccessibilityFinding;
}

function measured(ruleId: string): AccessibilityFinding {
  return {
    id: ruleId,
    source: "automated",
    severity: "serious",
    category: "dark-pattern",
    selector: "html > body > div",
    description: "",
    suggestedFix: "",
    ruleId,
  } as AccessibilityFinding;
}

describe("dropDuplicateConsentClaims", () => {
  // The case this exists for, taken from bundesregierung.de: two serious cards
  // side by side saying the same thing, one proved and one judged.
  it("drops the model's retelling of a consent fault we proved", () => {
    const kept = dropDuplicateConsentClaims(
      [
        ai({
          title: "Accepting cookies is one click, declining takes several",
          description:
            "Visitors can accept everything instantly, but to decline they must first expand a panel.",
        }),
      ],
      [measured("dark-consent-no-reject")]
    );
    expect(kept).toHaveLength(0);
  });

  // The one that reached a reader. The model writes in English and quotes the
  // page's own buttons, so on stedelijk.nl the retelling said the popup
  // "offers 'Accepteren' as a solid button". \b(accept)\b does not match
  // inside Accepteren, the reconciliation did nothing, and the report showed
  // the measured finding and the model's version of it one after the other.
  it("drops a retelling that quotes the page's own language", () => {
    const kept = dropDuplicateConsentClaims(
      [
        ai({
          title: "Cookie banner cannot be dismissed with equal ease",
          description:
            "The cookie popup offers 'Accepteren' as a solid button but the refusal option is labelled 'Noodzakelijke cookies' (necessary cookies only), which is not a plain reject choice.",
        }),
      ],
      [measured("dark-consent-no-reject")]
    );
    expect(kept).toHaveLength(0);
  });

  it("keeps it when no rule proved anything about the banner", () => {
    const kept = dropDuplicateConsentClaims(
      [
        ai({
          title: "Accepting cookies is one click, declining takes several",
          description: "Visitors can accept everything instantly, but declining is buried.",
        }),
      ],
      []
    );
    expect(kept).toHaveLength(1);
  });

  // The part worth protecting. These are the findings no rule here measures,
  // and they are the reason the AI layer earns its cost.
  it("keeps what the model saw that no rule measures", () => {
    const kept = dropDuplicateConsentClaims(
      [
        ai({
          title: "Consent text buries the number of third parties sharing data",
          description:
            "The banner mentions in passing that data may be shared with 1196 third parties.",
        }),
      ],
      [measured("dark-consent-no-reject")]
    );
    expect(kept).toHaveLength(1);
  });

  it("leaves findings outside the dark-pattern category alone", () => {
    const kept = dropDuplicateConsentClaims(
      [
        ai({
          category: "accessibility",
          title: "Accept button has no accessible name",
          description: "The reject control cannot be announced.",
        }),
      ],
      [measured("dark-consent-no-reject")]
    );
    expect(kept).toHaveLength(1);
  });

  it("also defers to the asymmetry rule, not just the missing-refusal one", () => {
    const kept = dropDuplicateConsentClaims(
      [ai({ title: "Accept is prominent while reject is plain text", description: "" })],
      [measured("dark-consent-asymmetry")]
    );
    expect(kept).toHaveLength(0);
  });
});
