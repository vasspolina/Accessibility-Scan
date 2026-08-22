// Builds an approximation of what a screen reader announces as it moves
// through the page, in reading order. This powers the "Screen reader preview"
// in the widget, where an owner can play the page back and hear it.
//
// Honesty matters here: this is a *simulation*, not a recording of NVDA, JAWS
// or VoiceOver. Real screen readers differ from each other in wording, verbosity
// settings, and how much they announce — so the widget labels this an
// approximation and the lines below stay close to the accessibility tree rather
// than imitating any one product's phrasing.
//
// The value isn't the exact words: it's that a sighted owner who has never used
// a screen reader can hear "button, unlabelled" or "image, no description"
// where their page says something meaningful visually, and immediately
// understand what the findings above actually cost their visitors.

// Types live in types/report.ts because they're part of the API response.
// Type-only imports are erased at compile time, so this doesn't break the
// self-containment the in-page collector needs.
import { randomUUID } from "node:crypto";
import type { AccessibilityFinding, ScreenReaderLine, ScreenReaderScript } from "../../types/report.js";

export type { ScreenReaderLine, ScreenReaderScript };

const MAX_LINES = 120;

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables, all helpers inline).
export function collectScreenReaderScriptInPage(): ScreenReaderScript {
  const MAX = 120;

  function cssPath(el: Element): string {
    if (el.id) return `#${el.id}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let selector = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const tag = node.tagName;
        const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
        if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(selector);
      node = parent;
    }
    return parts.join(" > ");
  }

  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

  // Hidden from assistive tech entirely — skip the element and its subtree.
  function isHiddenFromScreenReader(el: Element): boolean {
    if (el.getAttribute("aria-hidden") === "true") return true;
    if (el.hasAttribute("hidden")) return true;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return true;
    return false;
  }

  // Visually hidden but still announced (the skip-link pattern) — these are
  // legitimately part of the screen-reader experience, so don't drop them.
  function isVisuallyHiddenButRead(el: Element): boolean {
    const r = el.getBoundingClientRect();
    return r.width <= 1 || r.height <= 1;
  }

  function accessibleName(el: Element): string {
    const label = clean(el.getAttribute("aria-label"));
    if (label) return label;

    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const names = labelledBy
        .split(/\s+/)
        .map((id) => {
          try {
            const t = document.getElementById(id);
            return t ? clean(t.textContent) : "";
          } catch {
            return "";
          }
        })
        .filter(Boolean);
      if (names.length) return names.join(" ");
    }

    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") {
      const id = el.getAttribute("id");
      if (id) {
        try {
          const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (explicit) return clean(explicit.textContent);
        } catch {
          // unusable id — fall through
        }
      }
      const wrapping = el.closest("label");
      if (wrapping) return clean(wrapping.textContent);
      const placeholder = clean(el.getAttribute("placeholder"));
      if (placeholder) return placeholder;
      return "";
    }

    if (tag === "img") return clean(el.getAttribute("alt"));

    // For a link/button, an inner image's alt is the accessible name when
    // there's no text.
    const own = clean(el.textContent);
    if (own) return own;
    const innerImg = el.querySelector("img[alt]");
    if (innerImg) return clean(innerImg.getAttribute("alt"));
    return clean(el.getAttribute("title"));
  }

  // A container (landmark, region, table, frame) is named ONLY by an explicit
  // label — never by the text inside it. Screen readers work this way, and the
  // difference is not cosmetic: falling back to textContent would announce a
  // nav as its entire concatenated menu ("SearchXMenuCloseen/nlHomeNews…"),
  // which is both wrong and useless.
  function containerName(el: Element): string {
    const label = clean(el.getAttribute("aria-label"));
    if (label) return label;
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const names = labelledBy
        .split(/\s+/)
        .map((id) => {
          try {
            const t = document.getElementById(id);
            return t ? clean(t.textContent) : "";
          } catch {
            return "";
          }
        })
        .filter(Boolean);
      if (names.length) return names.join(" ");
    }
    return clean(el.getAttribute("title"));
  }

  // Punctuation-only or single-character runs ("/", "•", "—") are visual
  // separators, not content — a screen reader glides over them and listing
  // them here would just pad the transcript with noise.
  function isMeaningfulText(s: string): boolean {
    return s.length >= 2 && /[\p{L}\p{N}]/u.test(s);
  }

  // A name made only of punctuation or arrows ("…", "→", "»") is announced
  // literally and tells the listener nothing about what the control does.
  function isSymbolOnly(s: string): boolean {
    return s.length > 0 && !/[\p{L}\p{N}]/u.test(s);
  }

  // Alt text that is really a filename ("hero_banner-2.jpg", "IMG_4821.png").
  // It passes an "has alt text" check but is read aloud verbatim, so the
  // listener hears punctuation and digits instead of a description.
  function looksLikeFilename(s: string): boolean {
    if (/\.(jpe?g|png|gif|webp|svg|avif|bmp)\b/i.test(s)) return true;
    return /^[\w-]+$/.test(s) && /[_\d]/.test(s) && !/\s/.test(s);
  }

  // One place deciding whether a control's name is useful, so links and
  // buttons are judged consistently — a name that's unhelpful on a link is
  // just as unhelpful on a button. All of these pass an automated
  // "has an accessible name" check while telling a listener nothing.
  // The issue text sits directly under the announcement it refers to, so it
  // states only the consequence — repeating the name back ("This link is
  // announced as just 'nl'…") just says the same thing twice on screen.
  function unhelpfulNameReason(name: string, what: "link" | "button"): string | undefined {
    const purpose = what === "link" ? "where this goes" : "what this does";
    if (isSymbolOnly(name)) return `Punctuation alone doesn't say ${purpose}.`;
    // Two characters or fewer is almost always a code or icon glyph — a
    // language switcher reading "n l", a "×" close control, a bare ">".
    if (name.length <= 2) return `Too short to tell a listener ${purpose}.`;
    if (/^(https?:\/\/|www\.)/i.test(name)) {
      return "A raw web address is read out character by character.";
    }
    if (/^(click here|read more|more|here|learn more|link|continue|details|view|go)$/i.test(name)) {
      return `Out of context this says nothing about ${purpose}.`;
    }
    return undefined;
  }

  const lines: ScreenReaderLine[] = [];
  let truncated = false;
  const push = (line: ScreenReaderLine) => {
    if (lines.length >= MAX) {
      truncated = true;
      return false;
    }
    lines.push(line);
    return true;
  };

  const LANDMARK_TAGS: Record<string, string> = {
    header: "banner",
    nav: "navigation",
    main: "main",
    aside: "complementary",
    footer: "content information",
    form: "form",
    section: "region",
  };
  const TEXT_TAGS = new Set(["p", "li", "blockquote", "figcaption", "dd", "dt", "td", "th"]);

  // Walk in document order — that's the order a screen reader reads in.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as Element;
      if (isHiddenFromScreenReader(el)) return NodeFilter.FILTER_REJECT; // skip subtree
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const announcedText = new Set<string>();

  while (walker.nextNode()) {
    if (lines.length >= MAX) {
      truncated = true;
      break;
    }
    const el = walker.currentNode as Element;
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") ?? "").toLowerCase();
    const selector = cssPath(el);

    // --- Landmarks -------------------------------------------------------
    const landmarkRole =
      LANDMARK_TAGS[tag] ??
      (["banner", "navigation", "main", "complementary", "contentinfo", "region", "search"].includes(
        role
      )
        ? role
        : undefined);
    if (landmarkRole) {
      // <section>/role=region only count as landmarks when explicitly named.
      const name = containerName(el);
      if ((tag === "section" || role === "region") && !name) continue;
      push({
        text: name ? `${landmarkRole} landmark, “${cut(name, 60)}”` : `${landmarkRole} landmark`,
        kind: "landmark",
        selector,
      });
      continue;
    }

    // --- Headings --------------------------------------------------------
    const headingLevel = /^h([1-6])$/.exec(tag)?.[1] ?? (role === "heading" ? el.getAttribute("aria-level") ?? "2" : undefined);
    if (headingLevel) {
      const name = accessibleName(el);
      announcedText.add(name);
      push({
        text: name
          ? `heading level ${headingLevel}, “${cut(name, 80)}”`
          : `heading level ${headingLevel}, empty`,
        kind: "heading",
        selector,
        issue: name ? undefined : "Announced, but says nothing.",
        issueKind: name ? undefined : "missing",
      });
      continue;
    }

    // --- Links -----------------------------------------------------------
    if ((tag === "a" && el.hasAttribute("href")) || role === "link") {
      const name = accessibleName(el);
      announcedText.add(name);
      push({
        text: name ? `link, “${cut(name, 60)}”` : "link, no text",
        kind: "link",
        selector,
        issue: !name
          ? "A listener has no idea where this goes."
          : unhelpfulNameReason(name, "link"),
        issueKind: !name ? "missing" : unhelpfulNameReason(name, "link") ? "unhelpful" : undefined,
      });
      continue;
    }

    // --- Buttons ---------------------------------------------------------
    const isButton =
      tag === "button" ||
      role === "button" ||
      (tag === "input" && ["button", "submit", "reset", "image"].includes(el.getAttribute("type") ?? ""));
    if (isButton) {
      const name = accessibleName(el) || clean(el.getAttribute("value"));
      announcedText.add(name);
      push({
        text: name ? `button, “${cut(name, 60)}”` : "button, unlabelled",
        kind: "button",
        selector,
        issue: !name
          ? "A listener has no idea what this does."
          : unhelpfulNameReason(name, "button"),
        issueKind: !name ? "missing" : unhelpfulNameReason(name, "button") ? "unhelpful" : undefined,
      });
      continue;
    }

    // --- Images ----------------------------------------------------------
    if (tag === "img" || role === "img") {
      const alt = el.getAttribute("alt");
      // alt="" or role=presentation is the correct way to mark decoration —
      // a screen reader skips it, and so do we. That's not a problem.
      if (alt === "" || role === "presentation" || role === "none") continue;
      const name = accessibleName(el);
      push({
        text: name ? `image, “${cut(name, 80)}”` : "image, no description",
        kind: "image",
        selector,
        issue: !name
          ? "Its content is lost entirely to screen-reader users."
          : looksLikeFilename(name)
            ? "A filename read aloud describes nothing."
            : undefined,
        issueKind: !name ? "missing" : looksLikeFilename(name) ? "unhelpful" : undefined,
      });
      continue;
    }

    // --- Form fields -----------------------------------------------------
    if (tag === "input" || tag === "select" || tag === "textarea") {
      const type = (el.getAttribute("type") ?? (tag === "input" ? "text" : tag)).toLowerCase();
      if (type === "hidden") continue;
      const name = accessibleName(el);
      const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
      const kindWord =
        type === "checkbox" ? "checkbox" : type === "radio" ? "radio button" : tag === "select" ? "combo box" : "edit field";
      const bits = [kindWord];
      bits.push(name ? `“${cut(name, 60)}”` : "unlabelled");
      if (required) bits.push("required");
      push({
        text: bits.join(", "),
        kind: "field",
        selector,
        issue: name
          ? undefined
          : "A listener hears the field type, but not what to type.",
        issueKind: name ? undefined : "missing",
      });
      continue;
    }

    // --- Frames ----------------------------------------------------------
    if (tag === "iframe") {
      const name = clean(el.getAttribute("title")) || containerName(el);
      push({
        text: name ? `frame, “${cut(name, 60)}”` : "frame, unlabelled",
        kind: "frame",
        selector,
        issue: name ? undefined : "Its purpose isn't announced.",
        issueKind: name ? undefined : "missing",
      });
      continue;
    }

    // --- Lists and tables -------------------------------------------------
    if (tag === "ul" || tag === "ol") {
      const items = el.querySelectorAll(":scope > li").length;
      if (items > 0) push({ text: `list, ${items} items`, kind: "list", selector });
      continue;
    }
    if (tag === "table") {
      const rows = el.querySelectorAll("tr").length;
      const cols = el.querySelector("tr")?.children.length ?? 0;
      const caption = clean(el.querySelector("caption")?.textContent);
      push({
        text: caption
          ? `table, “${cut(caption, 50)}”, ${rows} rows, ${cols} columns`
          : `table, ${rows} rows, ${cols} columns`,
        kind: "table",
        selector,
        issue: caption ? undefined : "Its purpose isn't announced.",
      });
      continue;
    }

    // --- Plain text ------------------------------------------------------
    if (TEXT_TAGS.has(tag)) {
      // Only leaf-ish blocks, so a wrapper doesn't repeat its children's text.
      if (el.querySelector("p, li, blockquote, figcaption, dd, dt, td, th")) continue;
      // textContent, deliberately not innerText: innerText applies CSS
      // text-transform, so a link styled uppercase comes back "NL" when what a
      // screen reader actually announces is the underlying "nl".
      const text = clean(el.textContent);
      if (!isMeaningfulText(text)) continue;
      // A wrapper whose whole text comes from one link or button inside it is
      // already announced as that control — listing it again as plain text is
      // a duplicate no listener would hear (an <li> holding a single "nl"
      // language link, read out as "nl" and then again as "link, nl").
      // Compared case-insensitively so styling can't defeat the match.
      const soleControl = el.querySelector('a[href], button, [role="button"]');
      if (soleControl && clean(soleControl.textContent).toLowerCase() === text.toLowerCase()) {
        continue;
      }
      // Skip text already announced as part of a link/button/heading name.
      if (announcedText.has(text)) continue;
      push({ text: cut(text, 160), kind: "text", selector });
      continue;
    }
  }

  return { lines, truncated };
}

/**
 * Server-side post-processing: collapse consecutive identical announcements
 * (a repeated icon link in a list reads as the same line over and over) and
 * enforce the cap. Pure and deterministic so it can be unit-tested without a
 * browser.
 */
export function condenseScreenReaderScript(script: ScreenReaderScript): ScreenReaderScript {
  const lines: ScreenReaderLine[] = [];
  let repeats = 0;
  for (const line of script.lines) {
    const prev = lines[lines.length - 1];
    if (prev && prev.text === line.text && prev.kind === line.kind) {
      repeats += 1;
      continue;
    }
    if (repeats > 0 && prev) {
      prev.text = `${prev.text} (repeated ${repeats + 1} times)`;
      repeats = 0;
    }
    lines.push({ ...line });
  }
  const last = lines[lines.length - 1];
  if (repeats > 0 && last) last.text = `${last.text} (repeated ${repeats + 1} times)`;

  return { lines: lines.slice(0, MAX_LINES), truncated: script.truncated || lines.length > MAX_LINES };
}

/**
 * The lines whose names exist and help nobody, turned into findings.
 *
 * unhelpfulNameReason and looksLikeFilename above have detected these since
 * this module landed, and until now their only consumer was the preview
 * panel — so alt="IMG_4821.jpg" on every image left 1.1.1 reading "no
 * issues found", with the evidence sitting one section away. Only
 * issueKind "unhelpful" becomes a finding: the "missing" lines are axe's
 * (image-alt, link-name, button-name, label), and carding them here too
 * would be two cards for one fault.
 *
 * One card per kind, because a page with forty filename alts has one
 * problem forty times, not forty problems.
 */
export function evaluateScreenReaderScript(
  script: ScreenReaderScript | undefined
): AccessibilityFinding[] {
  if (!script) return [];
  const unhelpful = (kind: ScreenReaderLine["kind"]) =>
    script.lines.filter((l) => l.issueKind === "unhelpful" && l.kind === kind);

  const findings: AccessibilityFinding[] = [];
  const card = (
    lines: ScreenReaderLine[],
    ruleId: string,
    severity: AccessibilityFinding["severity"],
    criterion: string,
    level: "A" | "AA",
    description: (n: number, example: ScreenReaderLine) => string,
    suggestedFix: string,
    helpUrl: string
  ) => {
    if (lines.length === 0) return;
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity,
      category: "accessibility",
      wcagCriterion: criterion,
      wcagLevel: level,
      ruleId,
      selector: lines[0].selector,
      description: description(lines.length, lines[0]),
      suggestedFix,
      helpUrl,
    });
  };

  card(
    unhelpful("image"),
    "sr-filename-alt",
    "serious",
    "1.1.1",
    "A",
    (n, ex) =>
      `${n === 1 ? "An image describes itself" : `${n} images describe themselves`} to screen-reader users with ${n === 1 ? "a filename" : "filenames"} — e.g. ${ex.text}. A filename read aloud is punctuation and digits, not a description, so the image's content is lost even though an "images have alt text" check passes.`,
    "Write alt text that says what the image shows or does, in a short sentence. If an image is decoration, mark it so with an empty alt attribute and screen readers will skip it.",
    "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html"
  );
  card(
    unhelpful("link"),
    "sr-vague-link-name",
    "moderate",
    "2.4.4",
    "A",
    (n, ex) =>
      `${n === 1 ? "A link is announced" : `${n} links are announced`} with ${n === 1 ? "a name" : "names"} that ${n === 1 ? "says" : "say"} nothing about where ${n === 1 ? "it goes" : "they go"} — e.g. ${ex.text}. Screen-reader users often pull up all links as a list, and every one of these is a mystery there.`,
    "Name each link for its destination — \"View pricing\" rather than \"click here\", the document's title rather than a raw address. The name can come from visible text or an aria-label.",
    "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html"
  );
  card(
    unhelpful("button"),
    "sr-vague-button-name",
    "moderate",
    "2.4.6",
    "AA",
    (n, ex) =>
      `${n === 1 ? "A button is announced" : `${n} buttons are announced`} with ${n === 1 ? "a name" : "names"} that ${n === 1 ? "doesn't" : "don't"} say what ${n === 1 ? "it does" : "they do"} — e.g. ${ex.text}. A listener hears the label with no icon and no position to lean on, so "×" or ">" carries nothing.`,
    "Label each button with its action: \"Close\", \"Next slide\", \"Search\". If the visible design wants only an icon, put the words in an aria-label — the screen reader gets the label, the design keeps the icon.",
    "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html"
  );

  return findings;
}
