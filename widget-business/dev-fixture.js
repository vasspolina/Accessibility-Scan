// Dev-harness fixture. Loaded by index.html (dev server only — the library
// build never sees this file). Does nothing unless the page is opened with
// ?fixture in the URL, in which case it:
//   - stubs window.fetch for /api/scan and /api/audit with canned reports,
//     so every view and state of the widget can be rendered and audited
//     without a running backend;
//   - loads axe-core (copy backend/node_modules/axe-core/axe.min.js to
//     ./axe.dev.js — gitignored) so the rendered widget can be scanned with
//     the same engine the product itself uses.
//
// Special URLs: scan anything containing "error" for the error state, or
// "blocked" for the bot-wall state.
//
// ?fixture on its own stops at the form. To render a state that only exists
// after a submit, name it — ?fixture=report, ?fixture=error, ?fixture=blocked,
// with &audience=professional and &scope=site to pick the report variant, and
// &at=score (or &at=<element-id>) to park that section at the top of the
// viewport once it exists. See the auto-run block at the foot of this file.
(function () {
  if (!location.search.includes("fixture")) return;

  var axeScript = document.createElement("script");
  axeScript.src = "/axe.dev.js";
  document.head.appendChild(axeScript);

  // A drawn placeholder, not a real capture. The first version was a 1x1
  // grey pixel, which rendered as a blank white box — next to copy like
  // "written from the actual image" that read as the product failing, and it
  // was reported as exactly that. A fixture's fake data has to look fake on
  // purpose: this one is a grey card that says SAMPLE across it.
  function sampleShot(label) {
    var c = document.createElement("canvas");
    c.width = 480; c.height = 160;
    var g = c.getContext("2d");
    g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, 480, 160);
    g.fillStyle = "#c6c6c6"; g.fillRect(0, 0, 480, 28);
    for (var y = 48; y < 150; y += 22) {
      g.fillStyle = "#cfcfcf";
      g.fillRect(16, y, 300 + ((y * 7) % 120), 10);
    }
    g.fillStyle = "#8d8d8d";
    g.font = "bold 28px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText(label || "SAMPLE", 240, 100);
    return c.toDataURL("image/jpeg", 0.7).split(",")[1];
  }
  var TINY_JPEG = sampleShot("SAMPLE");

  function finding(over) {
    return Object.assign(
      {
        id: Math.random().toString(36).slice(2),
        source: "automated",
        severity: "moderate",
        category: "accessibility",
        selector: "body > main > p",
        description: "Example finding",
        suggestedFix: "Fix it like `this`.",
        ruleId: "color-contrast",
        wcagCriterion: "1.4.3",
        wcagLevel: "AA",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
      },
      over
    );
  }

  function makeReport(url) {
    var findings = [
      finding({
        id: "f1",
        severity: "serious",
        selector: ".hero > a.cta",
        elementSnippet: '<a href="/pricing" class="cta">See pricing</a>',
        description: "Text has a contrast of 2.9:1, below the 4.5:1 minimum.",
        suggestedFix: "Darken the text colour until it reaches 4.5:1.",
        elementScreenshot: TINY_JPEG,
        suggestedColour: { from: "#8a9bb0", to: "#4a617f", background: "#ffffff", ratio: 4.6, required: 4.5 },
        ageNote: "Contrast this faint sits below what reduced contrast sensitivity, a common change past sixty, can reliably resolve.",
      }),
      finding({
        id: "f2",
        severity: "serious",
        selector: "footer .legal",
        elementSnippet: '<span class="legal">All rights reserved</span>',
        description: "Text has a contrast of 3.2:1, below the 4.5:1 minimum.",
        suggestedFix: "Darken the text colour until it reaches 4.5:1.",
      }),
      finding({
        id: "f3",
        severity: "serious",
        selector: "nav .muted",
        elementSnippet: '<a href="/about" class="muted">About</a>',
        description: "Text has a contrast of 4.1:1, below the 4.5:1 minimum.",
        suggestedFix: "Darken the text colour until it reaches 4.5:1.",
      }),
      finding({
        id: "f4",
        severity: "critical",
        ruleId: "image-alt",
        wcagCriterion: "1.1.1",
        wcagLevel: "A",
        selector: ".gallery img:nth-child(1)",
        elementSnippet: '<img src="/bike.jpg">',
        description: "Image has no alt attribute.",
        suggestedFix: "Describe the image in an alt attribute.",
        elementScreenshot: TINY_JPEG,
        suggestedAltText: "A red bicycle leaning against a brick wall",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/image-alt",
      }),
      finding({
        id: "f5",
        severity: "critical",
        ruleId: "image-alt",
        wcagCriterion: "1.1.1",
        wcagLevel: "A",
        selector: ".gallery img:nth-child(2)",
        elementSnippet: '<img src="/divider.png">',
        description: "Image has no alt attribute.",
        suggestedFix: "Describe the image in an alt attribute.",
        suggestedAltText: "",
      }),
      finding({
        id: "f6",
        severity: "minor",
        ruleId: "link-name-vague",
        wcagCriterion: "2.4.4",
        wcagLevel: "A",
        selector: ".news a.more",
        elementSnippet: '<a href="/posts/spring-opening" class="more">Read more</a>',
        description: "Link text says nothing about where it goes.",
        suggestedFix: "Name the destination in the link text.",
      }),
      finding({
        id: "f7",
        source: "ai-review",
        severity: "moderate",
        category: "design-clarity",
        ruleId: undefined,
        wcagCriterion: "N/A",
        wcagLevel: undefined,
        selector: "main p",
        title: "Body text is set very small",
        description: "Paragraph text across the page is around 12px, which many readers will struggle with.",
        suggestedFix: "Raise body text to at least 16px.",
        confidence: "high",
        helpUrl: undefined,
      }),
      finding({
        id: "f8",
        severity: "moderate",
        category: "dark-pattern",
        ruleId: "countdown-pressure",
        wcagCriterion: "N/A",
        wcagLevel: undefined,
        selector: ".offer .countdown",
        title: "A countdown pressures the visitor",
        description: "A ticking countdown implies the offer expires, and it resets on reload.",
        suggestedFix: "Remove the countdown or make it truthful.",
        helpUrl: undefined,
      }),
      finding({
        id: "f9",
        severity: "serious",
        ruleId: "focus-not-visible",
        wcagCriterion: "2.4.7",
        wcagLevel: "AA",
        selector: ".menu button",
        elementSnippet: '<button class="menu-toggle" aria-label="Menu"></button>',
        description: "Keyboard focus is invisible on this control.",
        suggestedFix: "Restore the focus outline, or draw your own of at least 2px.",
      }),
    ];

    var srLines = [];
    var kinds = ["landmark", "heading", "link", "button", "image", "field", "list", "text"];
    for (var i = 0; i < 16; i++) {
      srLines.push({
        text:
          i === 3
            ? "button, unlabelled"
            : i === 7
              ? "link, Read more"
              : i === 12
                ? "image, bike dot jpg"
                : "Announcement " + (i + 1) + " of the page content",
        kind: kinds[i % kinds.length],
        selector: "sel-" + i,
        issue:
          i === 3
            ? "A button with no name — the listener hears only 'button'."
            : i === 7
              ? "Nine links on this page all announce 'Read more'."
              : i === 12
                ? "The file name is read out in place of a description."
                : undefined,
      });
    }

    function crit(id, name, level, status, plain, failing, count) {
      return {
        id: id,
        name: name,
        level: level,
        coverage: status === "needs-review" ? "manual" : "automated",
        plain: plain,
        failing: failing,
        status: status,
        findingCount: count,
      };
    }

    var conformance = {
      standard: "WCAG 2.1 AA",
      failed: 2,
      noIssuesFound: 26,
      needsReview: 22,
      total: 50,
      failedByLevel: { A: 1, AA: 1 },
      criteria: [
        crit("1.1.1", "Non-text Content", "A", "failed", "Do images have descriptions?", "Two images have no description at all.", 2),
        crit("1.4.3", "Contrast (Minimum)", "AA", "failed", "Can the text be read against its background?", "Three places are too pale to read.", 3),
        crit("2.1.1", "Keyboard", "A", "no-issues-found", "Does everything work with a keyboard?", "", 0),
        crit("2.4.7", "Focus Visible", "AA", "no-issues-found", "Can you see where the keyboard is?", "", 0),
        crit("1.2.2", "Captions (Prerecorded)", "A", "needs-review", "Do videos have captions?", "", 0),
        crit("3.1.5", "Reading Level", "AAA", "needs-review", "Is the wording plain enough?", "", 0),
      ],
    };

    var isPdf = url.includes("pdf");
    return {
      url: url,
      scannedAt: new Date().toISOString(),
      score: 62,
      summary: { critical: 2, serious: 4, moderate: 2, minor: 1, total: 9 },
      categorySummary: { accessibility: 7, designClarity: 1, darkPattern: 1 },
      findings: findings,
      screenReaderScript: { lines: srLines, truncated: true },
      conformance: conformance,
      wcag22: {
        standard: "WCAG 2.2",
        expectedFrom: "October 2026",
        alreadyFailing: 1,
        needsReview: 5,
        total: 6,
        parsingNoLongerCounts: true,
        criteria: [
          {
            id: "2.4.11",
            name: "Focus Not Obscured (Minimum)",
            level: "AA",
            coverage: "automated",
            plain: "Does the sticky header cover what you tabbed to?",
            failing: "The sticky header covers focused links beneath it.",
            status: "already-failing",
            findingCount: 2,
          },
          { id: "2.5.7", name: "Dragging Movements", level: "AA", coverage: "manual", plain: "Can every drag be done another way?", failing: "", whyManual: "Only a person can try the drag.", status: "needs-review", findingCount: 0 },
          { id: "2.5.8", name: "Target Size (Minimum)", level: "AA", coverage: "manual", plain: "Are tap targets big enough?", failing: "", status: "needs-review", findingCount: 0 },
          { id: "3.2.6", name: "Consistent Help", level: "A", coverage: "manual", plain: "Is help in the same place on every page?", failing: "", status: "needs-review", findingCount: 0 },
          { id: "3.3.7", name: "Redundant Entry", level: "A", coverage: "manual", plain: "Does a form ask for the same thing twice?", failing: "", status: "needs-review", findingCount: 0 },
          { id: "3.3.8", name: "Accessible Authentication", level: "AA", coverage: "manual", plain: "Can you sign in without solving a puzzle?", failing: "", status: "needs-review", findingCount: 0 },
        ],
      },
      undecidedChecks: [
        { ruleId: "color-contrast", count: 12, help: "Contrast could not be measured over an image background.", helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast" },
        { ruleId: "media-video-captions", count: 3, help: "Video with no captions track", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html" },
        { ruleId: "media-embedded-player", count: 2, help: "Video embedded from another site", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html" },
        { ruleId: "interaction-key-shortcuts", count: 1, help: "The page listens for key presses everywhere", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html" },
        { ruleId: "interaction-acts-on-change", count: 2, help: "Controls that may act as soon as you set them", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/on-input.html" },
        { ruleId: "interaction-pointer-cancellation", count: 4, help: "Controls that act the moment they are pressed", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html" },
        { ruleId: "media-audio-transcript", count: 1, help: "Audio with no transcript we can see", helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html" },
      ],
      pagePreview: TINY_JPEG,
      meta: {
        axeVersion: "4.10.2",
        renderTimeMs: 1234,
        aiReviewTimeMs: 8000,
        aiReviewStatus: "completed",
        incompleteChecks: ["phone-layout walk"],
        documentKind: isPdf ? "pdf" : undefined,
        documentPages: isPdf ? 4 : undefined,
      },
    };
  }

  function makeAudit(url) {
    return {
      entryUrl: url,
      scannedAt: new Date().toISOString(),
      pagesScanned: 3,
      pagesFailed: 1,
      averageScore: 71,
      worstPage: { url: url + "/contact", label: "Contact", score: 54, findingCount: 12 },
      pages: [
        { url: url, label: "Home", score: 78, findingCount: 6 },
        { url: url + "/contact", label: "Contact", score: 54, findingCount: 12 },
        { url: url + "/legal", label: "Legal", score: 0, findingCount: 0, error: "The page took too long to load." },
      ],
      consistency: [
        {
          criterion: "3.2.3",
          ruleId: "nav-order-inconsistent",
          title: "The menu is in a different order on some pages",
          description: "The menu on the home page lists its links in one order, and 2 other pages list the same links in a different one. People who navigate by position \u2014 by memory, by keyboard, or with a screen magnifier showing part of the screen at a time \u2014 have to find the menu again on every page.",
          pages: ["https://example.com/", "https://example.com/about", "https://example.com/shop"],
        },
        {
          criterion: "3.2.4",
          ruleId: "nav-name-inconsistent",
          title: "The same link is called different things",
          description: "One link goes to the same place under more than one name \u2014 for example \u201cbasket\u201d on one page and \u201ccart\u201d on another. Anyone who learned the first name has to work out that the second one is the same thing.",
          pages: ["https://example.com/", "https://example.com/shop"],
        },
      ],
      siteWide: [
        { ruleId: "image-alt", title: "Images have no descriptions", severity: "critical", pageCount: 3, totalOccurrences: 9, wcagCriterion: "1.1.1" },
        { ruleId: "color-contrast", title: "Text is too pale to read", severity: "serious", pageCount: 3, totalOccurrences: 21, wcagCriterion: "1.4.3" },
      ],
      conformance: makeReport(url).conformance,
    };
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var target = typeof input === "string" ? input : input.url;
    if (!/\/api\/(scan|audit)$/.test(target)) return realFetch(input, init);

    var body = {};
    try {
      body = JSON.parse(init && init.body ? init.body : "{}");
    } catch (e) { /* ignore */ }
    var url = body.url || "https://example.com";

    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        if (url.includes("error")) {
          resolve(new Response(JSON.stringify({ error: "The page could not be rendered. Check the address and try again." }), { status: 500, headers: { "Content-Type": "application/json" } }));
          return;
        }
        if (url.includes("blocked")) {
          resolve(new Response(JSON.stringify({ error: "The site turned our scanner away before the page loaded.", blocked: true }), { status: 403, headers: { "Content-Type": "application/json" } }));
          return;
        }
        var payload = /audit$/.test(target) ? makeAudit(url) : makeReport(url);
        resolve(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }));
      }, 1500);
    });
  };

  // ---- Auto-run, so report states can be rendered without an interaction ---
  //
  // ?fixture alone stops at the form: the report only exists after a submit.
  // That is fine for driving the widget by hand, and useless for anything that
  // renders the page fresh and then looks at it — a screenshot tool, a visual
  // diff, an axe run in CI. Those all get a form, or a blank band where they
  // scrolled to a report that was never built.
  //
  //   ?fixture=report                       a finished report
  //   ?fixture=report&audience=professional the pro view
  //   ?fixture=report&scope=site            a whole-site run
  //   ?fixture=error                        the scan-failed state
  //   ?fixture=blocked                      the bot-wall state
  //
  // It drives the real form rather than seeding state, because the state
  // belongs to App and nothing outside it can set it — and because a fixture
  // that takes a different path through the code proves less than one that
  // does not.
  var params = new URLSearchParams(location.search);
  var mode = params.get("fixture");

  // Pin the audience BEFORE the app mounts. App persists the last choice in
  // localStorage, so once ?audience=professional had been opened, every later
  // ?fixture=report rendered the professional view from the stored value — the
  // report was built, just not the one the URL asked for.
  //
  // That cost real time: the business view has .a11y-score and the pro view
  // has .a11y-pro-summary, so a check keyed on the wrong one reads as "the
  // scan never ran". It looked intermittent only because the two variants were
  // being opened alternately. A fixture that inherits state from the last run
  // is not a fixture.
  try {
    localStorage.setItem(
      "a11y-audience-mode",
      params.get("audience") === "professional" ? "professional" : "business"
    );
  } catch (e) { /* private mode — the click below still covers it */ }

  if (mode === "report" || mode === "error" || mode === "blocked") {
    // The stub branches on the address, so the state is chosen by what we type.
    var address = mode === "report" ? "example.com" : "example.com/" + mode;

    waitFor(function () {
      var host = document.getElementById("a11y-widget-business-root");
      var sr = host && host.shadowRoot;
      var input = sr && sr.querySelector("#a11y-url-input");
      return input && sr.querySelector("form") ? sr : null;
    }, function (sr) {
      // Options first — they have to be set before the submit that reads them.
      if (params.get("scope") === "site") click(sr, "#a11y-scope-site");
      click(sr, params.get("audience") === "professional" ? "#a11y-aud-pro" : "#a11y-aud-biz");

      var input = sr.querySelector("#a11y-url-input");
      // React tracks the previous value on the DOM node, so assigning .value
      // directly is swallowed as a no-op change. Go through the native setter
      // and then announce it.
      var setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      ).set;
      setValue.call(input, address);
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

      sr.querySelector("form").requestSubmit();

      // &at=<id> parks a section at the top of the viewport once the report
      // exists. Scrolling from outside cannot be relied on: anything that
      // renders the page fresh — a screenshot tool, a visual diff — starts at
      // the top and races this auto-run, so it captures a short page and a
      // blank band where the section had not been built yet. Doing it here
      // means the scroll happens after the report does, every time.
      var at = params.get("at");
      if (at) {
        var id = at === "score" ? "a11y-score-heading" : at;
        waitFor(function () {
          return sr.getElementById(id);
        }, function (el) {
          // The heading, not its section: a section can start above its own
          // title wherever a band is stacked in front of it.
          el.scrollIntoView({ block: "start", behavior: "instant" });
          window.scrollBy(0, -24);
        });
      }
    });
  }

  function click(sr, selector) {
    var el = sr.querySelector(selector);
    if (el) el.click();
  }

  // Polls rather than using MutationObserver: the widget mounts once, this
  // runs once, and a wrong answer here should be a warning in the console and
  // not a hang with no explanation.
  function waitFor(read, then) {
    var waited = 0;
    var tick = setInterval(function () {
      var found = read();
      if (found) { clearInterval(tick); then(found); return; }
      waited += 50;
      if (waited >= 10000) {
        clearInterval(tick);
        console.warn(
          "[dev-fixture] gave up waiting for the widget to mount; " +
          "?fixture=" + mode + " did not run."
        );
      }
    }, 50);
  }
})();
