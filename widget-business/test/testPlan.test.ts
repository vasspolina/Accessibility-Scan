import { describe, expect, it } from "vitest";
import { planSteps } from "../src/lib/testPlan";

describe("numbered test plan", () => {
  it("reads every bold-led numbered item as a step", () => {
    const steps = planSteps([
      "1. **Keyboard only.** Put the mouse away and tab through the page.",
      "2. **Zoom**: Set the browser to 200% and check nothing is cut off.",
      "3. **Forms** — Submit a form empty and listen to the errors.",
      "4) **Screen reader** Turn on VoiceOver and read the page.",
    ]);
    expect(steps).toEqual([
      { number: 1, title: "Keyboard only", body: "Put the mouse away and tab through the page." },
      { number: 2, title: "Zoom", body: "Set the browser to 200% and check nothing is cut off." },
      { number: 3, title: "Forms", body: "Submit a form empty and listen to the errors." },
      { number: 4, title: "Screen reader", body: "Turn on VoiceOver and read the page." },
    ]);
  });

  it("keeps the list's own numbers", () => {
    expect(planSteps(["5. **Content review.** Read it.", "6. **Motion and media.** Watch it."])?.map((s) => s.number)).toEqual([5, 6]);
  });

  it("leaves an ordinary numbered list alone", () => {
    expect(planSteps(["1. Open the page.", "2. Press Tab."])).toBeNull();
    expect(planSteps(["1. **Keyboard.** Tab through.", "2. Then zoom in."])).toBeNull();
    expect(planSteps(["1. **Keyboard.** Tab through."])).toBeNull();
  });
});
