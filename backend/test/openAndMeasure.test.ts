import { describe, it, expect } from "vitest";
import { evaluateFormErrors, notePanelFindings, panelViolations, type FormErrorProbe } from "../src/services/interaction/openAndMeasure.js";
import type { AccessibilityFinding } from "../src/types/report.js";

const probe = (over: Partial<FormErrorProbe>): FormErrorProbe => ({
  form: "#f",
  formName: "",
  native: false,
  requestAttempted: false,
  requiredEmpty: 1,
  newText: [],
  markedInvalid: 0,
  linked: 0,
  focusMoved: false,
  announced: false,
  ...over,
});

describe("the empty-submit form test", () => {
  it("scores only a form that refused without sending and without saying anything", () => {
    const { findings } = evaluateFormErrors([probe({})]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "form-error-silent", wcagCriterion: "3.3.1", wcagLevel: "A" });
  });

  it("does not judge a form that tried to send, because the server's answer was never let through", () => {
    expect(evaluateFormErrors([probe({ requestAttempted: true })])).toEqual({ findings: [], undecided: [] });
  });

  it("leaves the browser's own validation alone", () => {
    expect(evaluateFormErrors([probe({ native: true })])).toEqual({ findings: [], undecided: [] });
  });

  it("asks about errors that show but are not linked or announced, and nothing about ones that are", () => {
    const shown = evaluateFormErrors([probe({ newText: ["Please fill in the form."] })]);
    expect(shown.findings).toEqual([]);
    expect(shown.undecided.map((r) => r.ruleId)).toEqual(["form-error-unlinked", "form-error-unannounced"]);
    const done = evaluateFormErrors([probe({ newText: ["Enter your name."], markedInvalid: 1, linked: 1, focusMoved: true })]);
    expect(done).toEqual({ findings: [], undecided: [] });
  });
});

describe("findings from opened panels", () => {
  it("says which control opens the panel a finding was in", () => {
    const { axe, foundIn } = panelViolations([
      {
        control: "#b",
        controlName: "Opening times",
        kind: "disclosure",
        panel: "#times",
        violations: [{ id: "image-alt", impact: "critical", tags: [], description: "", help: "", helpUrl: "", nodes: [{ target: ["#times > img"], html: "<img>" }] }],
      },
    ]);
    expect(axe.violations).toHaveLength(1);
    const noted = notePanelFindings([{ ruleId: "image-alt", selector: "#times > img", description: "Image has no alt." } as AccessibilityFinding], foundIn);
    expect(noted[0].description).toContain("the panel “Opening times” opens");
  });
});
