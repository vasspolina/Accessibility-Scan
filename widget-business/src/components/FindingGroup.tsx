import { Fragment, useId, useState, type ReactNode } from "react";
import { dominantComponent, describeComponent } from "../lib/componentCluster";
import { SeverityTag } from "./SeverityTag";
import { ScanError, setFindingState, type AccessibilityFinding, type TriageState } from "../api/scanClient";
import { t, tf } from "../lib/strings";
import { getDecidedBy, setDecidedBy } from "../lib/apiKey";
import { Select } from "./Select2";
import { Input } from "./Input";
import { Button } from "./Button";
import { levelFraming, plainForRule, plainFixForRule } from "../lib/wcagPlain";
import { whatWeFound } from "../lib/findingText";
import { pictureNoteText } from "../lib/failureText";
import { useReportView } from "./ReportViewContext";
import { enClauseFor } from "../lib/audienceMode";
import { DataTable } from "./DataTable";
import { ElementShot } from "./ElementShot";
import {
  fixKindForFinding,
  isKeyboardCheck,
  isAiFinding,
  aiHint,
  keyboardHint,
} from "../lib/testMethod";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
};

/**
 * Renders `code spans` in advice text as real code.
 *
 * The fix strings name CSS properties and HTML attributes, and marked them up
 * with backticks the way the rest of this codebase writes prose. Nothing was
 * rendering them, so a reader was told to add "`outline-offset`" — backticks
 * included — which looks like a bug in the report and undermines the advice
 * sitting next to it.
 *
 * Splitting into React elements rather than setting HTML: the text is ours,
 * but some of it is assembled from page content, and there is no reason for
 * any of it to reach an HTML parser.
 */
function CodeText({ text }: { text: string }) {
  // A blank line means a new paragraph. Advice that leads with the plain
  // instruction and then addresses the developer needs the two visibly
  // apart, and HTML collapses the newline to a space if nobody does this.
  if (text.includes("\n\n")) {
    return (
      <>
        {text.split(/\n{2,}/).map((para, i) => (
          <span key={i} className={i > 0 ? "a11y-para" : undefined}>
            <CodeText text={para} />
          </span>
        ))}
      </>
    );
  }
  if (!text.includes("`")) return <>{text}</>;
  // Odd indexes are the spans between backtick pairs. A trailing unmatched
  // backtick simply leaves its text in an even slot and renders as prose.
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>
      )}
    </>
  );
}

/**
 * A translated sentence with elements inside it. The sentence is one key,
 * translated whole: {name} marks where an element goes, wherever the
 * language puts it, and <em>…</em> marks the words the translation stresses,
 * since only the translation knows which words those are.
 */
function Sentence({ text, parts = {} }: { text: string; parts?: Record<string, ReactNode> }) {
  return (
    <>
      {text.split(/(\{\w+\}|<em>.*?<\/em>)/).map((piece, i) => {
        const slot = piece.match(/^\{(\w+)\}$/);
        if (slot && slot[1] in parts) return <Fragment key={i}>{parts[slot[1]]}</Fragment>;
        const stressed = piece.match(/^<em>(.*)<\/em>$/);
        if (stressed) return <em key={i}>{stressed[1]}</em>;
        return piece;
      })}
    </>
  );
}

// Above this many occurrences of the same issue on one page, the affected-
// element list collapses to the first few plus a "show all" toggle.
const SUMMARY_THRESHOLD = 5;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Decode the handful of HTML entities that show up in element snippets, so a
// label reads "Residents & Alumni" rather than "Residents &amp; Alumni".
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Pull an attribute value out of a raw (possibly truncated) HTML snippet.
// Returns undefined for missing or empty values.
function attrOf(raw: string, name: string): string | undefined {
  const m = raw.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  const v = m?.[1]?.trim();
  return v ? v : undefined;
}

// Trims a label to a readable length, cutting on a word boundary where one is
// close by so a quoted excerpt doesn't end mid-word.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// "open-archive" / "first_name" → "Open archive" / "First name".
//
// Generated fragments are dropped rather than read out. Framework and consent
// markup is full of ids like "dialog-6a67b23825139" and
// "sp_message_container_1482251", and printing the hash gave an owner
// "Dialog 6a67b23825139" — a label that names nothing and looks like the
// report is malfunctioning. A part is treated as generated when it is long
// and carries a digit, which keeps "col-2" and "h1" intact.
function humanizeSlug(s: string): string {
  const words = s
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter((part) => part && !(part.length >= 6 && /\d/.test(part)))
    .join(" ")
    .trim();
  return words ? capitalize(words.toLowerCase()) : "";
}

// Where a link points, as a readable phrase. The last path segment is the
// part that names the destination; the rest is site plumbing.
function destinationOf(raw: string): string {
  const href = attrOf(raw, "href");
  const seg = href?.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop();
  if (!seg) return "";
  try {
    return humanizeSlug(decodeURIComponent(seg));
  } catch {
    // A malformed escape sequence shouldn't cost the whole label.
    return humanizeSlug(seg);
  }
}

// Link text that reads identically wherever it points, so the destination has
// to be shown alongside it. Kept in step with VAGUE_LINK_TEXT in the backend's
// analyzeComponents — the backend decides what to flag, this decides how to
// label it, and they describe the same idea.
const SAYS_NOTHING =
  /^(read\s*more|more|learn\s*more|click\s*here|here|find\s*out\s*more|see\s*more|view\s*more|details|more\s*details|continue|continue\s*reading|go|link|this\s*link|full\s*story|read\s*on|next|previous|…|\.\.\.|>|>>|→|»)$/i;

// The everyday word for an element, keyed off its tag (and input type).
const KIND_WORDS: Record<string, string> = {
  a: "link",
  button: "button",
  select: "dropdown",
  textarea: "text field",
  img: "image",
  svg: "icon",
  li: "list item",
  nav: "navigation",
  form: "form",
  section: "section",
  header: "header",
  footer: "footer",
  label: "label",
  // Text-carrying elements — these are what the typography checks flag, and
  // "Paragraph" reads far better than "P" to a non-technical owner.
  p: "paragraph",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  blockquote: "quote",
  figcaption: "caption",
  caption: "caption",
  td: "table cell",
  th: "table heading",
  dd: "list item",
  dt: "list item",
  span: "text",
  div: "block of text",
  main: "main content",
  article: "article",
  aside: "sidebar",
  ul: "list",
  ol: "list",
  table: "table",
};

/* The labels built from those words, in the reader's language. One whole key
   per kind rather than a translated kind word dropped into a translated
   frame: German, Spanish and French put the kind before the quoted name, and
   that order has to live in the key. Covers every word elementKindWord can
   return. */
const NAMED_KIND: Record<string, string> = {
  link: "“{name}” link",
  button: "“{name}” button",
  dropdown: "“{name}” dropdown",
  "text field": "“{name}” text field",
  image: "“{name}” image",
  icon: "“{name}” icon",
  "list item": "“{name}” list item",
  navigation: "“{name}” navigation",
  form: "“{name}” form",
  section: "“{name}” section",
  header: "“{name}” header",
  footer: "“{name}” footer",
  label: "“{name}” label",
  paragraph: "“{name}” paragraph",
  heading: "“{name}” heading",
  quote: "“{name}” quote",
  caption: "“{name}” caption",
  "table cell": "“{name}” table cell",
  "table heading": "“{name}” table heading",
  text: "“{name}” text",
  "block of text": "“{name}” block of text",
  "main content": "“{name}” main content",
  article: "“{name}” article",
  sidebar: "“{name}” sidebar",
  list: "“{name}” list",
  table: "“{name}” table",
  checkbox: "“{name}” checkbox",
  "radio button": "“{name}” radio button",
  field: "“{name}” field",
  element: "“{name}” element",
};

const KIND_LABEL: Record<string, string> = {
  link: "Link",
  button: "Button",
  dropdown: "Dropdown",
  "text field": "Text field",
  image: "Image",
  icon: "Icon",
  "list item": "List item",
  navigation: "Navigation",
  form: "Form",
  section: "Section",
  header: "Header",
  footer: "Footer",
  label: "Label",
  paragraph: "Paragraph",
  heading: "Heading",
  quote: "Quote",
  caption: "Caption",
  "table cell": "Table cell",
  "table heading": "Table heading",
  text: "Text",
  "block of text": "Block of text",
  "main content": "Main content",
  article: "Article",
  sidebar: "Sidebar",
  list: "List",
  table: "Table",
  checkbox: "Checkbox",
  "radio button": "Radio button",
  field: "Field",
  element: "Element",
};

// What fieldPurpose recognises, as the field's whole label.
const FIELD_LABEL: Record<string, string> = {
  Email: "Email field",
  "Phone number": "Phone number field",
  Search: "Search field",
  Password: "Password field",
  Name: "Name field",
  Postcode: "Postcode field",
  Address: "Address field",
};

function namedKind(name: string, kind: string): string {
  const key = NAMED_KIND[kind];
  return key ? tf(key, { name }) : `“${name}” ${kind}`;
}

function kindLabel(kind: string): string {
  const key = KIND_LABEL[kind];
  return key ? t(key) : capitalize(kind);
}

function fieldLabel(purpose: string): string {
  const key = FIELD_LABEL[purpose];
  return key ? t(key) : `${purpose} field`;
}

/**
 * Whether a label names a particular thing or only a category of thing.
 *
 * "“Toggle search” button" locates something. "Heading" does not — it is what
 * prettySelector falls back to when the selector is a bare tag and no snippet
 * came with the finding, which is where an AI finding usually lands because
 * the model writes its own selector and we never measured the element.
 *
 * Reported on a card headed "Screen reader hears exhibition dates with no
 * artwork description", whose affected-element list read, in full: Heading.
 */
export function labelNamesSomething(label: string): boolean {
  const generic = new Set([...Object.values(KIND_WORDS).map(kindLabel), t("Element")]);
  return !generic.has(label.trim());
}

function elementKindWord(tag: string | undefined, type: string | undefined): string {
  if (tag === "input") {
    switch ((type ?? "text").toLowerCase()) {
      case "checkbox":
        return "checkbox";
      case "radio":
        return "radio button";
      case "submit":
      case "button":
      case "image":
        return "button";
      default:
        return "field";
    }
  }
  return (tag && KIND_WORDS[tag]) ?? "element";
}

// Guess what a form field is for, from its name/id/placeholder/type.
function fieldPurpose(raw: string, type: string | undefined): string | undefined {
  const hay = `${attrOf(raw, "name") ?? ""} ${attrOf(raw, "id") ?? ""} ${
    attrOf(raw, "placeholder") ?? ""
  } ${attrOf(raw, "autocomplete") ?? ""}`.toLowerCase();
  const t = (type ?? "").toLowerCase();
  if (t === "email" || /e-?mail/.test(hay)) return "Email";
  if (t === "tel" || /phone|\btel\b|mobile/.test(hay)) return "Phone number";
  if (t === "search" || /search/.test(hay)) return "Search";
  if (t === "password" || /password/.test(hay)) return "Password";
  if (/first.?name|last.?name|full.?name|\bname\b/.test(hay)) return "Name";
  if (/zip|postal|postcode/.test(hay)) return "Postcode";
  if (/address|street/.test(hay)) return "Address";
  return undefined;
}

// A readable name for a finding that carries only a CSS selector, no HTML
// snippet (the component/dialog/mobile layers work this way). Uses the last
// segment: a bare tag becomes its everyday word ("… > form" → "Form"); an
// id/class becomes its humanized name, recognising a field purpose where the
// name gives it away ("#mce-EMAIL" → "Email field").
function prettySelector(sel: string): string {
  // Undo CSS.escape before reading the selector as words. The backend has to
  // escape ids to produce valid CSS — an id may legally start with a digit,
  // where "#6a67…" is a syntax error — so a selector can arrive as
  // "#\36 a67b23825139", and splitting that on whitespace finds nothing
  // recognisable.
  const readable = sel.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
  const last = readable.split(/[>\s]+/).filter(Boolean).pop() ?? readable;

  // A plain tag selector (no leading # or .).
  if (/^[a-zA-Z]/.test(last)) {
    const tag = last.match(/^[a-zA-Z][\w-]*/)?.[0]?.toLowerCase();
    if (tag) return KIND_WORDS[tag] ? kindLabel(KIND_WORDS[tag]) : capitalize(tag);
  }

  // An id or class selector — humanize the first id/class token.
  const token = last.replace(/^[#.]/, "").split(/[#.:[]/)[0];
  if (token) {
    const purpose = fieldPurpose(`name="${token}"`, undefined);
    if (purpose) return fieldLabel(purpose);
    const words = humanizeSlug(token.replace(/^mc[e_-]+/i, ""));
    if (words) return words;
  }
  return t("Element");
}

// A plain-language, human-readable name for one affected element, derived
// from its semantics (label text, link text, field purpose) instead of raw
// HTML. This is what tells a non-technical owner *which* element has the
// issue — "“Toggle search” button" rather than a wall of class names.
function elementLabel(finding: AccessibilityFinding): string {
  const raw = finding.elementSnippet?.replace(/\s+/g, " ").trim();
  if (!raw) return prettySelector(finding.selector);

  const tag = raw.match(/^<\s*([a-zA-Z][\w-]*)/)?.[1]?.toLowerCase();
  const type = attrOf(raw, "type");
  const kind = elementKindWord(tag, type);

  // 1. An explicit accessible name is the best label.
  const ariaLabel = attrOf(raw, "aria-label");
  if (ariaLabel) return namedKind(decodeEntities(ariaLabel), kind);

  // 2. Visible text content, when the snippet isn't truncated before it.
  const inner = raw.match(/>([^<]{1,160})</)?.[1]?.replace(/\s+/g, " ").trim();
  if (inner && !/^translation_missing/i.test(inner)) {
    const name = truncate(decodeEntities(inner), 60);
    // A list of nine “Read more” links is nine identical rows, which is the
    // very complaint the finding is making. Where the text says nothing,
    // the destination is the only thing that tells them apart.
    if (tag === "a" && SAYS_NOTHING.test(decodeEntities(inner))) {
      const dest = destinationOf(raw);
      if (dest) return tf("“{name}” link to {destination}", { name, destination: dest });
    }
    return namedKind(name, kind);
  }

  // 3. An image's alt text.
  const alt = attrOf(raw, "alt");
  if (alt) return namedKind(decodeEntities(alt), "image");

  // 4. An icon-only control — the inner image's alt text names it.
  const innerAlt = raw.match(/<img\b[^>]*\balt\s*=\s*"([^"]+)"/i)?.[1]?.trim();
  if (innerAlt) return namedKind(decodeEntities(innerAlt), kind);

  // 5. A submit/button input carries its label in value=.
  const value = attrOf(raw, "value");
  if (value && (kind === "button" || tag === "input")) {
    return namedKind(decodeEntities(value), kind);
  }

  // 6. A tooltip is a weaker name, but better than none. Skip a truncated one
  //    (the snippet was cut mid-attribute) and framework placeholder text.
  const title = attrOf(raw, "title");
  if (title && !/\.\.\.$|…$/.test(title) && !/^translation_missing/i.test(title)) {
    return namedKind(decodeEntities(title), kind);
  }

  // 7. A link with no text of its own — name it by where it points. Phrased
  //    "link to X", never "“X” link": quoting it would read as the link's own
  //    text, which is exactly what a "link has no readable text" finding is
  //    telling the owner it lacks.
  if (tag === "a") {
    const dest = destinationOf(raw);
    if (dest) return tf("link to {destination}", { destination: dest });
  }

  // 8. Last resort before a bare kind word: a meaningful id/name attribute
  //    ("#newsletter-submit" → "Newsletter submit button").
  if (kind === "button" || kind === "link") {
    const ident = attrOf(raw, "id") ?? attrOf(raw, "name");
    if (ident && !/^[0-9a-f-]{8,}$/i.test(ident)) {
      const h = humanizeSlug(ident);
      if (h && h.toLowerCase() !== kind) {
        return tf(kind === "button" ? "{name} button" : "{name} link", { name: h });
      }
    }
  }

  // 9. A custom widget role (e.g. a carousel slide) names itself.
  const roleDesc = attrOf(raw, "aria-roledescription");
  if (roleDesc) return capitalize(roleDesc.toLowerCase());

  // 10. A form field — describe its purpose, or flag a hidden one.
  if (kind === "field" || kind === "checkbox" || kind === "radio button") {
    if (attrOf(raw, "tabindex") === "-1") return t("Hidden field");
    const purpose = fieldPurpose(raw, type);
    return purpose ? fieldLabel(purpose) : kindLabel(kind);
  }

  // 11. Nothing distinctive — the element type is the best we can do.
  return kindLabel(kind);
}

// Collapse repeated elements into one row with a ×N count, so the list stays
// scannable. Two elements merge when they're the same *kind* of thing:
//  - identical plain labels ("Home" link × 3), or
//  - members of one numbered series that share an aria-roledescription
//    (18 carousel slides labelled "Slide 1 of 18" … "Slide 18 of 18" all
//    share roledescription "slide" → one "Slide" row).
// Image findings carrying a per-image alt-text suggestion are never merged —
// each needs its own distinct description.
type OccurrenceEntry = { rep: AccessibilityFinding; count: number; label: string };

function occurrenceGrouping(finding: AccessibilityFinding): { key: string; label: string } {
  if (finding.suggestedAltText !== undefined) {
    return { key: `id:${finding.id}`, label: elementLabel(finding) };
  }
  const raw = finding.elementSnippet?.replace(/\s+/g, " ").trim();
  const roleDesc = raw ? attrOf(raw, "aria-roledescription") : undefined;
  if (roleDesc) {
    return { key: `role:${roleDesc.toLowerCase()}`, label: capitalize(roleDesc.toLowerCase()) };
  }
  const label = elementLabel(finding);
  return { key: `label:${label}`, label };
}

function dedupeOccurrences(findings: AccessibilityFinding[]): OccurrenceEntry[] {
  const byKey = new Map<string, OccurrenceEntry>();
  const order: string[] = [];
  for (const f of findings) {
    const { key, label } = occurrenceGrouping(f);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { rep: f, count: 1, label });
      order.push(key);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

// The exact selectors/snippets for the developer hand-off, de-duplicated so a
// repeated element is listed once. Shows the CSS selector alongside the HTML,
// because the snippet has class/style attributes stripped for readability and
// the selector is what actually locates the element in the page.
function devElementRefs(findings: AccessibilityFinding[]): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];
  for (const f of findings) {
    const snippet = f.elementSnippet?.replace(/\s+/g, " ").trim();
    const ref = snippet ? `${f.selector}  ·  ${snippet}` : f.selector;
    if (ref && !seen.has(ref)) {
      seen.add(ref);
      refs.push(ref);
    }
  }
  return refs;
}

// One titled group = every occurrence of the same issue on the page. The
// shared explanation (why it matters, one clean instruction, learn-more) is
// shown once; below it, the specific elements affected are listed so the
// owner knows exactly what to fix.
// Everything about a group beyond its one-line summary: why it matters, one
// clean instruction, which elements are affected, and (in professional mode)
// the hand-off detail. Shared by the print-only card below and the on-screen
// table row's expand panel — one source for content that must appear
// wherever the group does, collapsed or on paper.
export function FindingDetails({
  findings,
  asNotes = false,
}: {
  findings: AccessibilityFinding[];
  asNotes?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const { professional, criterionNames } = useReportView();

  const rep = findings[0];
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  const title = plain?.plain ?? rep.title ?? rep.description;
  const fix = fixKindForFinding(rep);
  const keyboardCheck = isKeyboardCheck(rep);
  const fromAi = isAiFinding(rep);
  const whatToDo = plainFixForRule(rep.ruleId) ?? rep.suggestedFix;
  const entries = dedupeOccurrences(findings);
  const measured = whatWeFound(rep, plain, entries.length, title);
  const locatesSomething = entries.some(
    (e) => labelNamesSomething(e.label) || e.rep.elementScreenshot
  );
  const cluster = dominantComponent(findings);
  const summarize = entries.length > SUMMARY_THRESHOLD;
  const visibleEntries = summarize && !showAll ? entries.slice(0, SUMMARY_THRESHOLD) : entries;
  // Same derivation as the row's WCAG cell, and blank on the same terms:
  // best-practice rules arrive as "WCAG (see rule help)", which names no
  // criterion a reader could look up.
  const criterion =
    rep.wcagCriterion && rep.wcagCriterion !== "N/A"
      ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? "")
      : "";

  return (
    /* A real element, not a fragment. The two-column layout has to live on
       a box inside the expanded cell: setting display:grid on the <td>
       itself takes the cell out of table formatting, its colspan stops
       applying, and the cell collapsed to 33px with both columns inside
       it. Measured, in all three engines. */
    <div className="a11y-fd">
      {/* Two real column boxes, the kit's own composition. The children
          used to sit flat in the grid with grid-column rules assigning
          each to a side — which row-locked them: a grid row is as tall as
          its tallest cell across BOTH columns, so a 65px hint beside a
          262px steps list carried 196px of dead space, and the affected
          list opposite a short research note carried 403px. Measured
          grid-template-rows: 261px 129px 129px 557px. Columns that flow
          independently cannot do that. */}
      <div className="a11y-fd-col">
      {/* What was actually measured on this page. It used to sit inside
          the technical drawer, two clicks from view, which left the
          summary above saying a ring was "too pale" and never how pale or
          on how many controls — the numbers are the most useful sentence
          in the finding. Skipped when there is no plain-language title,
          because then the description is already the heading. */}
      {/* Three hints, three paragraphs. They used to be concatenated into one
          with spaces, which produced a sixty-seven word block under a label
          that promised to answer one question and then answered three. Each
          of these answers something different — who does the work, whether
          you can check it without them, and where the finding came from — so
          each gets its own line and its own label. */}
      <p className="a11y-method-hint">
        <strong>{t("Who fixes this")}</strong> {fix.hint}
      </p>
      {keyboardCheck && (
        <p className="a11y-method-hint">
          <strong>{t("Check it yourself")}</strong> {keyboardHint()}
        </p>
      )}
      {fromAi && (
        <p className="a11y-method-hint">
          <strong>{t("Where this came from")}</strong> {aiHint()}
        </p>
      )}
      {!rep.elementScreenshot && pictureNoteText(rep) && (
        <p className="a11y-picture-note">{pictureNoteText(rep)}</p>
      )}
      {/* The rule's own account of what was found where it has one, and
          the finding's description otherwise. axe supplies a requirement
          rather than a finding — "Links must have discernible text" — and
          that read as a category error under this heading.

          This used to require a plain-language entry, on the reasoning
          that without one the description was already serving as the
          heading. True for axe findings, false for every AI one: those
          write a short headline of their own and put the substance in the
          description. So the substance went to the technical drawer, two
          clicks down, and where a finding had neither rule id nor
          criterion the drawer never rendered and the description was not
          shown anywhere at all. Measured across the European sweep: 32 of
          80 AI findings arrived as a headline and three badges. */}
      {measured && (
        <p className="a11y-finding-measured">
          <strong className="a11y-fd-title">{t("What we found")}</strong> <CodeText text={measured} />
        </p>
      )}
      {/* Its own line, not folded into the text above: rules with a
          plain-language account replace the description entirely, which
          made the first of these notes invisible on the very rule it
          attached to. */}
      {rep.ageNote && (
        <p className="a11y-finding-measured">
          <strong>{t("Past sixty")}</strong> <CodeText text={rep.ageNote} />
        </p>
      )}
      {/* Shared explanation — shown once for the whole group */}
      {plain && (
        <p className="a11y-finding-impact">
          <strong className="a11y-fd-title">{t("Why this matters")}</strong> <CodeText text={plain.impact} />
        </p>
      )}
      {/* Curated, hand-verified research context — never generated per
          scan, which is how invented statistics happen. */}
      {plain?.research && (
        <p className="a11y-finding-research">
          <strong>{t("What the research shows")}</strong> <CodeText text={plain.research} />
        </p>
      )}
      </div>

      <div className="a11y-fd-col">
      {/* Steps get a list; a single action stays a sentence. Both carry the
          same "What to do" label, so the reader is never hunting for where
          the advice starts. */}
      {Array.isArray(whatToDo) ? (
        <div className="a11y-finding-steps">
          <p>
            <strong className="a11y-fd-title">{t("What to do")}</strong>
          </p>
          <ul>
            {whatToDo.map((step) => (
              <li key={step}>
                <CodeText text={step} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="a11y-finding-todo">
          <strong className="a11y-fd-title">{t("What to do")}</strong> <CodeText text={whatToDo} />
        </p>
      )}
      {/* The WCAG and Level columns fold in here at phone width, the same
          way Severity folds into the Issue cell. The CSS that drops those
          columns said they stayed reachable in this panel; they didn't —
          nothing here carried them, so a phone reader lost the criterion
          and, more to the point, the sentence saying the item is required
          by law. Hidden above that width, where both columns show. */}
      {!asNotes && (criterion || rep.wcagLevel) && (
        <p className="a11y-finding-level-fold">
          {criterion && (
            <>
              <strong>{t("WCAG:")}</strong> {criterion}
              {rep.wcagLevel ? " · " : ""}
            </>
          )}
          {rep.wcagLevel && levelFraming(rep.wcagLevel)}
        </p>
      )}
      {rep.helpUrl && (
        <p className="a11y-fd-learn">
          <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
            {t("Learn more about this issue")} <span aria-hidden="true">↗</span>
          </a>
        </p>
      )}

      {locatesSomething && (
      <div className="a11y-affected">
        <p className="a11y-affected-label">
          <strong>{count > 1 ? t("Affected elements") : t("Affected element")}</strong>
        </p>
        <ul className="a11y-occurrence-list">
          {visibleEntries.map((e) => (
            <Occurrence key={e.rep.id} finding={e.rep} label={e.label} repeatCount={e.count} />
          ))}
        </ul>
        {/* A toggle, not a self-removing button: a control that vanishes
            under the keyboard focus that just pressed it strands the
            user. */}
        {summarize && (
          <button
            type="button"
            className="a11y-show-all"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? t("Show fewer") : tf("Show all {count} kinds of element", { count: entries.length })}
          </button>
        )}
      </div>
      )}
      </div>

      {cluster && (
        <p className="a11y-fix-once">
          <strong>{tf("Fix once, fixes {count}.", { count: cluster.count })}</strong>{" "}
          <Sentence
            text={t(
              cluster.share < 1
                ? "These all come from the same component, {component} (most of them)."
                : "These all come from the same component, {component}."
            )}
            parts={{ component: <code>{describeComponent(cluster.signature)}</code> }}
          />
        </p>
      )}

      {/* Which specific elements are affected.
          Dropped entirely when not one row would name anything: a list
          whose only entry is the word "Heading" tells the reader less
          than the sentence above it already did, while looking like it
          is about to be useful. The count is on the header badge and the
          selector is in the technical drawer, so nothing is lost. */}
      {/* Professional mode: the hand-off detail open on the card, not
          two clicks down. Criterion cited by number, name and level from
          the same table the conformance section renders; the EN 301 549
          clause derived mechanically (chapter 9 maps one-to-one onto
          WCAG 2.1 A/AA) and never claimed for AAA or N/A. */}
      {professional && (
        <div className="a11y-pro-block">
          {(() => {
            const num = rep.wcagCriterion?.match(/^(\d\.\d+\.\d+)/)?.[1];
            const known = num ? criterionNames[num] : undefined;
            const en = enClauseFor(rep.wcagCriterion, rep.wcagLevel);
            return (
              <>
                {num && (
                  <p className="a11y-pro-line">
                    <strong>{t("WCAG:")}</strong> {num}
                    {known ? ` ${known.name} (${known.level})` : rep.wcagLevel ? ` (${rep.wcagLevel})` : ""}
                    {en ? <span className="a11y-pro-en"> · {en}</span> : null}
                  </p>
                )}
                <p className="a11y-pro-line">
                  <strong>{t("Selector:")}</strong> <code>{rep.selector}</code>
                </p>
                {rep.elementSnippet && (
                  /* Scrolls horizontally, so it must be reachable by
                     keyboard — our own scan flags scrollable regions a
                     Tab press cannot enter. role="group", not "region":
                     a region is a landmark, and one per card would fill
                     the landmark list with identical entries. */
                  <pre
                    className="a11y-pro-snippet"
                    tabIndex={0}
                    role="group"
                    aria-label={t("Element markup")}
                  >
                    <code>{rep.elementSnippet}</code>
                  </pre>
                )}
                {rep.helpUrl && (
                  <p className="a11y-pro-line">
                    <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                      {t("Fix technique")} <span aria-hidden="true">↗</span>
                    </a>
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Developer hand-off — the rule reference, shown once. Redundant
          in professional mode, where the block above is already open. */}
      {!professional && (rep.ruleId || rep.wcagCriterion) && (
        <details className="a11y-tech-details">
          <summary>{t("The technical version")}</summary>
          {/* Only when it was not already shown in the open part of the
              card above. It nearly always is now. */}
          {!measured && rep.description && (
            <p>
              <strong>{t("What we found:")}</strong> <CodeText text={rep.description} />
            </p>
          )}
          {rep.wcagCriterion && rep.wcagCriterion !== "N/A" && (
            <p>
              <strong>{t("WCAG criterion:")}</strong> {rep.wcagCriterion}
            </p>
          )}
          {rep.ruleId && (
            <p>
              <strong>{t("Rule:")}</strong> <code>{rep.ruleId}</code>
            </p>
          )}
          <p>
            <strong>{count > 1 ? t("Affected elements:") : t("Affected element:")}</strong>
          </p>
          <ul className="a11y-tech-elements">
            {devElementRefs(findings).map((ref, i) => (
              <li key={i}>
                <code>{ref}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
      {/* The owner's mark, on every path a group's details render —
          the card and the professional table's expand row alike. */}
      {!asNotes && <TriageControl finding={rep} />}
    </div>
  );
}

/* The Instances cell. The count used to be the bare string "3 ×" in a
   table cell, which put a number and a floating multiplication sign in a
   column with nothing to hold them — the design gives them a bordered
   tile instead, and the border is doing real work here: the fill is a
   hair off white (1.02:1 against the row) and would otherwise be
   invisible.
   Number and mark are two flex children because the design's 10px gap is
   between them, not inside a string. The mark is aria-hidden and carries
   no replacement text: the column header already says "Instances", so a
   screen reader hears "Instances, 3" and adding "3 places" here would
   say the same thing twice. */
export function CountPill({ count }: { count: number }) {
  // The number alone: the "×" mark beside it read as a second symbol to
  // decode under a header that already says Instances (16 Oct 2026).
  return <span className="a11y-count-pill">{count}</span>;
}

// One DataTable row for a group: severity, title plus its WCAG/fix-kind
// context, and the occurrence count. asNotes drops the severity cell — a
// remark on the design isn't ranked the way a defect is, and wearing "Fix
// first"/"Minor polish" made these read as scored findings however plainly
// the section above already said otherwise.
export function findingRow(
  findings: AccessibilityFinding[],
  {
    asNotes = false,
    showLevel = true,
    showCount = true,
  }: { asNotes?: boolean; showLevel?: boolean; showCount?: boolean } = {}
): { id: string; cells: ReactNode[]; expand: ReactNode } {
  const rep = findings[0];
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  const title = plain?.plain ?? rep.title ?? rep.description;
  const fix = fixKindForFinding(rep);
  const keyboardCheck = isKeyboardCheck(rep);
  const fromAi = isAiFinding(rep);

  const issueCell = (
    <span className="a11y-finding-issue">
      {/* Severity's own column (below) is hidden at phone width — its
          badge plus the Issue text plus the arrow column already exceeded
          the viewport there, forcing horizontal scroll before a reader
          reached the row's actual content — and folds in here instead,
          above the title. a11y-finding-sev-fold is itself hidden by
          default and only shown at that same narrow width, so wide
          screens see Severity in its column, not doubled up. */}
      {!asNotes && (
        <span className="a11y-finding-sev-fold">
          <SeverityTag severity={rep.severity} label={t(severityLabel[rep.severity])} />
        </span>
      )}
      <span className="a11y-finding-title">{title}</span>
      {(keyboardCheck || fromAi || (rep.triage && rep.triage.state !== "open")) && (
        <span className="a11y-finding-meta-line">
          {keyboardCheck && (
            <span className="a11y-method-badge a11y-method-keyboard">{t("Keyboard test")}</span>
          )}
          {fromAi && <span className="a11y-method-badge a11y-method-ai">{t("AI review")}</span>}
          {rep.triage && rep.triage.state !== "open" && (
            <span className={`a11y-method-badge a11y-triage-badge a11y-triage-${rep.triage.state}`}>
              {t(TRIAGE_BADGE[rep.triage.state])}
            </span>
          )}
        </span>
      )}
    </span>
  );

  // Best-practice rules with no numbered criterion arrive as the literal
  // string "WCAG (see rule help)". Used to strip a leading "WCAG" and show
  // the rest — "(see rule help)" — which just traded one confusing string
  // for another: a reader has no way to know what that parenthetical means
  // sitting alone in the WCAG column. Nothing has the same effect as
  // nothing: leave the cell blank, same as any other row with no criterion.
  const criterion =
    rep.wcagCriterion && rep.wcagCriterion !== "N/A"
      ? (rep.wcagCriterion.match(/^\d\.\d+\.\d+/)?.[0] ?? "")
      : "";

  return {
    id: rep.id,
    cells: asNotes
      ? [issueCell, ...(showCount ? [count > 1 ? <CountPill key="n" count={count} /> : ""] : [])]
      : [
          // Severity's own column. Hidden at phone width by CSS
          // (a11y-finding-sev-col), where the folded copy inside
          // issueCell takes over instead.
          <span key="sev" className="a11y-finding-sev-col">
            <SeverityTag severity={rep.severity} label={t(severityLabel[rep.severity])} />
          </span>,
          issueCell,
          criterion,
          <span key="fix" className={`a11y-method-badge a11y-fix-${fix.key}`}>
            {fix.label}
          </span>,
          // Column dropped entirely by FindingsList when no group in the
          // table has a level at all — an empty column is worse than no
          // column, and best-practice rules (no numbered criterion) never
          // carry one.
          ...(showLevel ? [rep.wcagLevel ? levelFraming(rep.wcagLevel) : ""] : []),
          // Same reasoning as Level: a group of dark-pattern or notes
          // findings is almost always singular, so "Instances" reads
          // blank on every row — drop the whole column rather than ship
          // an empty one.
          ...(showCount ? [count > 1 ? <CountPill key="n" count={count} /> : ""] : []),
        ],
    expand: <FindingDetails findings={findings} asNotes={asNotes} />,
  };
}

export function FindingGroup({
  findings,
  asNotes = false,
}: {
  findings: AccessibilityFinding[];
  // A remark on the design rather than a fault to rank. Drops the severity
  // chip: "Fix first" and "Minor polish" are the vocabulary of the scored
  // list, and wearing them made these look like scored findings however
  // plainly the section above said otherwise.
  asNotes?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { professional } = useReportView();

  const rep = findings[0]; // most severe (list is pre-sorted by severity)
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  // Deterministic findings get a plain-language title from the rule map; AI
  // findings write their own. Only fall back to the description when neither
  // exists — it's a paragraph, which reads badly as a heading.
  const title = plain?.plain ?? rep.title ?? rep.description;
  const detailsId = `a11y-group-${rep.id}`;
  // Where the change is made, and whether the owner can confirm it without
  // help. Two separate questions, two separate marks.
  const fix = fixKindForFinding(rep);
  const keyboardCheck = isKeyboardCheck(rep);
  const fromAi = isAiFinding(rep);

  return (
    /* This card is the printed report's own copy — see FindingsList, which
       renders it always-in-the-DOM and print-only, and a live DataTable for
       the screen. A page of bare titles with no "why this matters", no fix
       and no affected elements is not a report, and a table's expand state
       cannot be forced open from CSS, so print gets a form that can hold
       everything open on its own.

       asNotes marks the advisory rows so the stylesheet can give them the
       kit's DesignNotes anatomy — flat dividers rather than cards, and the
       evidence given real room, because for a remark like "text too tight"
       the screenshot IS the argument and a thumbnail too small to read it
       in proves nothing. */
    <li
      className={`a11y-finding a11y-severity-${rep.severity}${asNotes ? " a11y-finding-note" : ""}`}
    >
      <button
        type="button"
        className="a11y-finding-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        {/* The image column is reserved whether or not this particular
            finding has one — a table where some rows carry a picture and
            others don't otherwise puts the title (and everything folded
            under it) at a different starting column row to row, which
            reads as misaligned rather than as a table. asNotes is the one
            context where every row already carries real evidence, so it
            never needs the empty placeholder. */}
        <ElementShot finding={rep} />
        {!asNotes && (
          <SeverityTag severity={rep.severity} label={t(severityLabel[rep.severity])} />
        )}
        <span className="a11y-finding-desc">
          {title}
          {/* Best-practice rules with no numbered criterion arrive as the
              literal string "WCAG (see rule help)" — there's no criterion
              number to show for those, and "WCAG (see rule help)" isn't
              one either, so the badge is skipped entirely rather than
              printing a fragment that means nothing on its own. */}
          {!professional && rep.wcagCriterion?.match(/^\d\.\d+\.\d+/)?.[0] && (
            <span className="a11y-finding-criterion">
              WCAG {rep.wcagCriterion.match(/^\d\.\d+\.\d+/)![0]}
            </span>
          )}
        </span>
        {/* A second line, folded under the title rather than trailing beside
            it on the first: severity and the title are what the row is
            about, count/method/fix/level are what to do about it, and the
            reference keeps those two questions visually separate instead
            of running them all together on one crowded line. */}
        <span className="a11y-finding-meta">
          {count > 1 && <span className="a11y-count-badge">{count}×</span>}
          {keyboardCheck && (
            <span className="a11y-method-badge a11y-method-keyboard">{t("Keyboard test")}</span>
          )}
          {fromAi && <span className="a11y-method-badge a11y-method-ai">{t("AI review")}</span>}
          {rep.triage && rep.triage.state !== "open" && (
            <span className={`a11y-method-badge a11y-triage-badge a11y-triage-${rep.triage.state}`}>
              {t(TRIAGE_BADGE[rep.triage.state])}
            </span>
          )}
          <span className={`a11y-method-badge a11y-fix-${fix.key}`}>{fix.label}</span>
          {rep.wcagLevel && (
            <span className="a11y-level-badge">{levelFraming(rep.wcagLevel)}</span>
          )}
          {professional && rep.ruleId && <code className="a11y-rule-chip">{rep.ruleId}</code>}
        </span>
      </button>

      {/* Always rendered, hidden when collapsed, rather than rendered only
          when open. Two reasons.

          The print stylesheet forces these open so a printed report stands on
          its own — a page of bare titles with no "why this matters", no fix
          and no affected elements is not a report. That rule could never work
          against conditional rendering: CSS cannot reveal what React never put
          in the DOM. Measured on a nine-finding report, the PDF contained
          zero of them.

          And aria-controls above pointed at an element that did not exist
          while collapsed, which is exactly what that attribute must not do. */}
      <div id={detailsId} className="a11y-finding-details" hidden={!expanded}>
        <FindingDetails findings={findings} asNotes={asNotes} />
      </div>
    </li>
  );
}

export const TRIAGE_WORD: Record<TriageState, string> = {
  open: "Open",
  ignored: "Ignored",
  "false-positive": "False positive",
  fixed: "Fixed",
};

/** What the badge says. It only ever sits on a finding the scan has just
 *  found, so a bare "Fixed" there would be a contradiction — the claim was
 *  made and the scan disagrees, and the badge has to say so. */
export const TRIAGE_BADGE: Record<TriageState, string> = {
  ...TRIAGE_WORD,
  fixed: "Marked fixed, still found",
};

/**
 * "Mark as": the owner's decision about this finding, kept on the server
 * per site. Offered only for a saved scan — a decision has to belong to
 * somebody, and it is keyed by the fingerprint the server minted.
 *
 * What it does not do is remove the card or move the score. An ignored
 * finding is still a measured fault; the mark says the owner has seen it
 * and decided, and the CLI leaves marked findings out of its thresholds
 * while saying how many it left out.
 */
function TriageControl({ finding }: { finding: AccessibilityFinding }) {
  const { apiBase, siteUrl, signedIn } = useReportView();
  const [state, setState] = useState<TriageState>(finding.triage?.state ?? "open");
  const [note, setNote] = useState(finding.triage?.note ?? "");
  const [name, setName] = useState(getDecidedBy());
  const [saved, setSaved] = useState<{ state: TriageState; decidedBy: string; decidedAt: string } | null>(finding.triage ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!signedIn || !apiBase || !siteUrl || !finding.fingerprint) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("Sign the decision with your name."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDecidedBy(name);
      const d = await setFindingState(apiBase!, {
        origin: siteUrl!,
        fingerprint: finding.fingerprint!,
        state,
        note: note.trim() || undefined,
        decidedBy: name.trim(),
      });
      setSaved({ state: d.state, decidedBy: d.decidedBy, decidedAt: d.decidedAt });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ScanError ? err.message : t("Could not save the decision."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a11y-triage">
      {saved && saved.state !== "open" && (
        <p className="a11y-triage-current">
          {tf("Marked: {state}", { state: t(TRIAGE_WORD[saved.state]) })}{" "}
          <em>
            ({saved.decidedBy}, {saved.decidedAt.slice(0, 10)})
          </em>
        </p>
      )}
      {open ? (
        <form className="a11y-triage-form" onSubmit={save} aria-label={tf("Mark finding {rule}", { rule: finding.ruleId ?? "" })}>
          <Select
            id={`${id}-state`}
            label={t("Mark as")}
            options={[
              { value: "open", label: t("Open") },
              { value: "ignored", label: t("Ignored") },
              { value: "false-positive", label: t("False positive") },
              { value: "fixed", label: t("Fixed") },
            ]}
            value={state}
            onChange={(e) => setState(e.target.value as TriageState)}
          />
          <Input id={`${id}-note`} label={t("Why, in a sentence")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Input
            id={`${id}-name`}
            label={t("Your name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(error)}
            invalidText={error ?? undefined}
          />
          <div className="a11y-manual-form-actions">
            <Button variant="primary" size="sm" type="submit" disabled={busy}>
              {busy ? t("Saving…") : t("Save")}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)} disabled={busy}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {saved && saved.state !== "open" ? t("Change the mark") : t("Mark this finding")}
        </Button>
      )}
    </div>
  );
}

// A single affected element: a plain-language label, a thumbnail when we
// captured one, a ×N badge when several identical elements were collapsed
// into this row, and any per-element alt-text suggestion.
function Occurrence({
  finding,
  label,
  repeatCount,
}: {
  finding: AccessibilityFinding;
  label: string;
  repeatCount: number;
}) {
  const hasAlt = finding.suggestedAltText !== undefined;
  const { professional } = useReportView();
  return (
    <li className="a11y-occurrence">
      <div className="a11y-occurrence-head">
        <span className="a11y-occurrence-label">{label}</span>
        {repeatCount > 1 && <span className="a11y-occurrence-count">{repeatCount}×</span>}
      </div>
      <ElementShot finding={finding} showLocator={professional} />
      {hasAlt && <AltTextSuggestion value={finding.suggestedAltText!} />}
      {finding.suggestedColour && <ColourSuggestion suggestion={finding.suggestedColour} />}
    </li>
  );
}

// Hands over a colour that would pass, rather than a ratio and a problem.
//
// Every other tool reports "1.96:1, needs 4.5:1", which states the fault and
// leaves the reader to solve it — and the reader is usually not the person who
// chose the colour. The swatches are there because a hex code alone does not
// tell a non-designer whether the suggestion is still their colour. Seeing the
// two side by side does.
function ColourSuggestion({
  suggestion,
}: {
  suggestion: NonNullable<AccessibilityFinding["suggestedColour"]>;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(suggestion.to);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the value is on screen to copy by hand.
    }
  }

  return (
    <div className="a11y-colour-fix">
      <p className="a11y-colour-fix-line">
        <strong>{t("A colour that would pass:")}</strong>{" "}
        <Sentence
          text={t("change {from} to {to}")}
          parts={{
            from: (
              <span className="a11y-swatch-pair">
                <span
                  className="a11y-swatch"
                  style={{ background: suggestion.from, borderColor: suggestion.background }}
                  aria-hidden="true"
                />
                <code>{suggestion.from}</code>
              </span>
            ),
            to: (
              <span className="a11y-swatch-pair">
                <span
                  className="a11y-swatch"
                  style={{ background: suggestion.to, borderColor: suggestion.background }}
                  aria-hidden="true"
                />
                <code>{suggestion.to}</code>
              </span>
            ),
          }}
        />{" "}
        {/* The name is one whole phrase, so it translates whole, and the
            visible word is inside it in every language. */}
        <button
          type="button"
          className="a11y-copy-btn"
          onClick={copy}
          aria-label={copied ? t("Copied the suggested colour") : t("Copy the suggested colour")}
        >
          {copied ? t("Copied") : t("Copy")}
        </button>
        {/* The button's own text changing is not reliably announced;
            this mounted status region is. */}
        <span className="a11y-sr-only" role="status">
          {copied ? t("Colour copied to the clipboard.") : ""}
        </span>
      </p>
      <p className="a11y-colour-fix-note">
        {tf(
          "Same hue, dark enough to reach {ratio}:1 against {background}, where {required}:1 is the minimum. Adjust it to taste as long as it stays at or above that.",
          { ratio: suggestion.ratio, background: suggestion.background, required: suggestion.required }
        )}
      </p>
    </div>
  );
}

// Renders the AI's alt-text suggestion for an image missing one. An empty
// value is meaningful — it means the image is decorative and the right fix
// is an empty alt attribute, not a description.
function AltTextSuggestion({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  if (value === "") {
    return (
      <p className="a11y-alt-suggestion a11y-alt-decorative">
        <strong>{t("Suggested alt text:")}</strong>{" "}
        <Sentence
          text={t(
            "This image looks decorative, so give it an <em>empty</em> alt text ({code}). That tells screen readers to skip it."
          )}
          parts={{ code: <code>alt=""</code> }}
        />
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the text is still shown to copy manually.
    }
  }

  return (
    <div className="a11y-alt-suggestion">
      <p className="a11y-alt-suggestion-label">
        <Sentence
          text={t("{label}, written from the actual image:")}
          parts={{ label: <strong>{t("Suggested alt text")}</strong> }}
        />
      </p>
      <div className="a11y-alt-suggestion-value">
        <code>{value}</code>
        <button
          type="button"
          className="a11y-alt-copy"
          onClick={copy}
          aria-label={copied ? t("Copied the suggested alt text") : t("Copy the suggested alt text")}
        >
          {copied ? t("Copied") : t("Copy")}
        </button>
        <span className="a11y-sr-only" role="status">
          {copied ? t("Alt text copied to the clipboard.") : ""}
        </span>
      </div>
    </div>
  );
}
