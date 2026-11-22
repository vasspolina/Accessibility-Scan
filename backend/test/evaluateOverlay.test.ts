import { describe, it, expect } from "vitest";
import {
  evaluateOverlay,
  describeOverlay,
  OVERLAY_MARKER_SELECTORS,
} from "../src/services/overlay/analyzeOverlay.js";
import { summarizeSeverity, scoreFindings, summarizeCategories } from "../src/services/merge/scoring.js";
import { accessibilityReportSchema } from "../src/types/report.js";
import type { AccessibilityFinding } from "../src/types/report.js";

// The script addresses are the ones read on each vendor's documentation or
// own site on 22 November 2026 (see the table in analyzeOverlay.ts). They
// arrive from the collector with the query string already removed.
const SEEN: Array<[vendor: string, script: string, marker: string]> = [
  ["accessiBe", "https://acsbapp.com/apps/app/dist/js/app.js", "access-widget-ui"],
  ["UserWay", "https://cdn.userway.org/widget.js", "#userwayAccessibilityIcon"],
  ["AudioEye", "https://wsmcdn.audioeye.com/aem.js", "#ae_app > .ae-module"],
  ["EqualWeb", "https://cdn.equalweb.com/core/5.2.8/accessibility.js", "#INDshadowRootWrap"],
  ["Equally AI", "https://widget.equally.ai/equally-widget.min.js", "equally-widget-ui"],
  [
    "Accessibly",
    "https://dash.accessiblyapp.com/widget/df78635d-6e72-4b99-a230-bf49fd606873/autoload.js",
    "#accessiblyAppWidgetButton",
  ],
  ["Eye-Able", "https://cdn.eye-able.com/public/js/eyeAble.js", "#eyeAble_container_ID"],
  ["DIGIaccess", "https://download.digiaccess.org/digiaccess", "digiaccess-widget"],
];

describe("evaluateOverlay", () => {
  it.each(SEEN)("names %s from its script, with the address as the evidence", (vendor, script) => {
    const out = evaluateOverlay({
      scriptSrcs: ["https://example.com/app.js", script],
      markers: [],
    });
    // The widget element was not there, and the result says so: a script
    // tag is not proof the widget ran.
    expect(out).toEqual([{ vendor, scriptUrl: script, widgetOnPage: false }]);
  });

  it.each(SEEN)("says %s's widget was on the page when its element is there", (vendor, script, marker) => {
    const out = evaluateOverlay({ scriptSrcs: [script], markers: [marker] });
    expect(out).toEqual([{ vendor, scriptUrl: script, widgetOnPage: true }]);
  });

  it("asks the page about one marker per vendor in the table", () => {
    expect([...OVERLAY_MARKER_SELECTORS].sort()).toEqual(SEEN.map(([, , m]) => m).sort());
  });

  it("recognises the other addresses the vendors publish", () => {
    const names = (src: string) => evaluateOverlay({ scriptSrcs: [src], markers: [] }).map((o) => o.vendor);
    // UserWay's pinned variant, from its help centre.
    expect(names("https://cdn.userway.org/widgetapp/2026-11-13-10-20-20/widget_app_1794565220298.js")).toEqual(["UserWay"]);
    // AudioEye's second host, which aem.js injects.
    expect(names("https://wsv3cdn.audioeye.com/bootstrap.js")).toEqual(["AudioEye"]);
    // EqualWeb's install page.
    expect(names("https://aacdn.equalweb.com/widget.js")).toEqual(["EqualWeb"]);
    // Accessibly's documented host and its CDN.
    expect(names("https://dash.accessibly.app/widget/abc/autoload.js")).toEqual(["Accessibly"]);
    expect(names("https://cdn.accessibly.app/accessibly/2.0.3/accessibly.js")).toEqual(["Accessibly"]);
    // Eye-Able's second CDN and the per-domain config file.
    expect(names("https://www.eye-able-cdn.com/public/js/eyeAble.js")).toEqual(["Eye-Able"]);
    expect(names("https://cdn.eye-able.com/configs/www.example.com.js")).toEqual(["Eye-Able"]);
  });

  it("gives the loader as the evidence when a vendor has several scripts on the page", () => {
    const out = evaluateOverlay({
      scriptSrcs: [
        "https://wsmcdn.audioeye.com/aem.js",
        "https://wsv3cdn.audioeye.com/bootstrap.js",
        "https://wsv3cdn.audioeye.com/static-scripts/v2/2026-11-20c/loader.bundle.js",
      ],
      markers: ["#ae_app > .ae-module"],
    });
    expect(out).toEqual([
      { vendor: "AudioEye", scriptUrl: "https://wsmcdn.audioeye.com/aem.js", widgetOnPage: true },
    ]);
  });

  it("names a widget whose script the site serves from its own address", () => {
    // eye-able.com itself does this: /eye-able/eye-able.js on its own host.
    const out = evaluateOverlay({
      scriptSrcs: ["https://www.example.de/eye-able/eye-able.js"],
      markers: ["#eyeAble_container_ID"],
    });
    expect(out).toEqual([{ vendor: "Eye-Able", widgetOnPage: true }]);
    expect(out[0]).not.toHaveProperty("scriptUrl");
  });

  it("reports two overlays when a page carries two", () => {
    const out = evaluateOverlay({
      scriptSrcs: ["https://cdn.userway.org/widget.js", "https://acsbapp.com/apps/app/dist/js/app.js"],
      markers: ["access-widget-ui"],
    });
    expect(out.map((o) => [o.vendor, o.widgetOnPage])).toEqual([
      ["accessiBe", true],
      ["UserWay", false],
    ]);
  });

  describe("silence", () => {
    it("says nothing about a page with no overlay", () => {
      expect(
        evaluateOverlay({
          scriptSrcs: [
            "https://www.googletagmanager.com/gtm.js",
            "https://example.com/assets/app.js",
            "https://consent.cookiebot.com/uc.js",
          ],
          markers: [],
        })
      ).toEqual([]);
    });

    it("does not name a vendor from a filename on somebody else's host", () => {
      // The patterns are anchored on the host: "accessibility.js" and
      // "widget.js" are names anyone could have chosen.
      expect(
        evaluateOverlay({
          scriptSrcs: [
            "https://example.com/core/5.2.8/accessibility.js",
            "https://example.com/widget.js",
            "https://example.com/apps/app/dist/js/app.js",
            "https://static.example.com/vendor/cdn.userway.org/widget.js",
            "https://example.com/public/js/eyeAble.js",
          ],
          markers: [],
        })
      ).toEqual([]);
    });

    it("does not name a vendor from a host that only contains its name", () => {
      expect(
        evaluateOverlay({
          scriptSrcs: [
            "https://notacsbapp.com/apps/app/dist/js/app.js",
            "https://cdn.userway.org.example.com/widget.js",
            "https://widget.equally.ai.evil.example/equally-widget.min.js",
          ],
          markers: [],
        })
      ).toEqual([]);
    });

    it("does not name a vendor from pages of its own website that are not the widget", () => {
      // A link-in-script to the vendor's marketing site is not the widget.
      expect(
        evaluateOverlay({
          scriptSrcs: ["https://userway.org/app.js", "https://www.audioeye.com/_next/static/chunks/1.js", "https://accessibe.com/wp-includes/js/jquery/jquery.min.js"],
          markers: [],
        })
      ).toEqual([]);
    });

    it("names nobody from a file:, data: or unparseable address", () => {
      expect(
        evaluateOverlay({
          scriptSrcs: ["file:///tmp/acsbapp.com/apps/app/dist/js/app.js", "data:text/javascript,1", "not a url"],
          markers: [],
        })
      ).toEqual([]);
    });

    it("ignores a marker that is not in the table", () => {
      expect(evaluateOverlay({ scriptSrcs: [], markers: ["#ae_app", ".access-widget-ui"] })).toEqual([]);
    });

    it("returns an empty list, not an error, when the signal is absent", () => {
      expect(evaluateOverlay(undefined)).toEqual([]);
      expect(evaluateOverlay({} as never)).toEqual([]);
    });
  });
});

describe("describeOverlay: the CLI's line", () => {
  it("states what was seen and nothing about the product", () => {
    expect(
      describeOverlay({ vendor: "accessiBe", scriptUrl: "https://acsbapp.com/apps/app/dist/js/app.js", widgetOnPage: true })
    ).toBe("accessiBe (https://acsbapp.com/apps/app/dist/js/app.js), widget on the page during the scan");
    expect(
      describeOverlay({ vendor: "UserWay", scriptUrl: "https://cdn.userway.org/widget.js", widgetOnPage: false })
    ).toBe("UserWay (https://cdn.userway.org/widget.js), widget not on the page during the scan");
    expect(describeOverlay({ vendor: "Eye-Able", widgetOnPage: true })).toBe(
      "Eye-Able, widget on the page during the scan"
    );
  });
});

describe("the overlay note and the numbers", () => {
  // The note lives on meta, and the score, the severity counts and the
  // category counts are functions of the findings list alone. This pins the
  // shape that keeps it so: the evaluator returns nothing a finding list
  // could hold, and a report carrying overlays still parses.
  const finding: AccessibilityFinding = {
    id: "1",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    wcagCriterion: "1.1.1",
    wcagLevel: "A",
    selector: "img",
    description: "d",
    suggestedFix: "s",
    ruleId: "image-alt",
  };

  it("returns no field a finding is scored or counted by", () => {
    const [o] = evaluateOverlay({ scriptSrcs: ["https://cdn.userway.org/widget.js"], markers: [] });
    expect(Object.keys(o).sort()).toEqual(["scriptUrl", "vendor", "widgetOnPage"]);
    for (const key of ["severity", "category", "wcagCriterion", "wcagLevel", "ruleId", "suggestedFix"]) {
      expect(o).not.toHaveProperty(key);
    }
  });

  it("parses on a report, and leaves score, summary and categories as they were", () => {
    const findings = [finding];
    const base = {
      url: "https://example.com/",
      scannedAt: "2026-11-22T00:00:00.000Z",
      score: scoreFindings(findings),
      summary: summarizeSeverity(findings),
      categorySummary: summarizeCategories(findings),
      findings,
      meta: { axeVersion: "4", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" as const },
    };
    const withOverlay = {
      ...base,
      meta: {
        ...base.meta,
        overlays: evaluateOverlay({ scriptSrcs: ["https://cdn.userway.org/widget.js"], markers: [] }),
      },
    };
    const a = accessibilityReportSchema.parse(base);
    const b = accessibilityReportSchema.parse(withOverlay);
    expect(b.meta.overlays).toEqual([
      { vendor: "UserWay", scriptUrl: "https://cdn.userway.org/widget.js", widgetOnPage: false },
    ]);
    expect(b.score).toBe(a.score);
    expect(b.summary).toEqual(a.summary);
    expect(b.categorySummary).toEqual(a.categorySummary);
    expect(b.findings).toEqual(a.findings);
  });
});
