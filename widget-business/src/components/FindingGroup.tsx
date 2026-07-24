import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { LEVEL_FRAMING, plainForRule, plainFixForRule } from "../lib/wcagPlain";

const severityLabel: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
  minor: "Minor polish",
};

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
function humanizeSlug(s: string): string {
  const words = s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? capitalize(words.toLowerCase()) : "";
}

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
  const last = sel.split(/[>\s]+/).filter(Boolean).pop() ?? sel;

  // A plain tag selector (no leading # or .).
  if (/^[a-zA-Z]/.test(last)) {
    const tag = last.match(/^[a-zA-Z][\w-]*/)?.[0]?.toLowerCase();
    if (tag) return capitalize(KIND_WORDS[tag] ?? tag);
  }

  // An id or class selector — humanize the first id/class token.
  const token = last.replace(/^[#.]/, "").split(/[#.:[]/)[0];
  if (token) {
    const purpose = fieldPurpose(`name="${token}"`, undefined);
    if (purpose) return `${purpose} field`;
    const words = humanizeSlug(token.replace(/^mc[e_-]+/i, ""));
    if (words) return words;
  }
  return "Element";
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
  if (ariaLabel) return `“${decodeEntities(ariaLabel)}” ${kind}`;

  // 2. Visible text content, when the snippet isn't truncated before it.
  const inner = raw.match(/>([^<]{1,160})</)?.[1]?.replace(/\s+/g, " ").trim();
  if (inner && !/^translation_missing/i.test(inner)) {
    return `“${truncate(decodeEntities(inner), 60)}” ${kind}`;
  }

  // 3. An image's alt text.
  const alt = attrOf(raw, "alt");
  if (alt) return `“${decodeEntities(alt)}” image`;

  // 4. An icon-only control — the inner image's alt text names it.
  const innerAlt = raw.match(/<img\b[^>]*\balt\s*=\s*"([^"]+)"/i)?.[1]?.trim();
  if (innerAlt) return `“${decodeEntities(innerAlt)}” ${kind}`;

  // 5. A submit/button input carries its label in value=.
  const value = attrOf(raw, "value");
  if (value && (kind === "button" || tag === "input")) {
    return `“${decodeEntities(value)}” ${kind}`;
  }

  // 6. A tooltip is a weaker name, but better than none. Skip a truncated one
  //    (the snippet was cut mid-attribute) and framework placeholder text.
  const title = attrOf(raw, "title");
  if (title && !/\.\.\.$|…$/.test(title) && !/^translation_missing/i.test(title)) {
    return `“${decodeEntities(title)}” ${kind}`;
  }

  // 7. A link with no text of its own — name it by where it points. Phrased
  //    "link to X", never "“X” link": quoting it would read as the link's own
  //    text, which is exactly what a "link has no readable text" finding is
  //    telling the owner it lacks.
  if (tag === "a") {
    const href = attrOf(raw, "href");
    const seg = href?.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop();
    if (seg) {
      const h = humanizeSlug(decodeURIComponent(seg));
      if (h) return `link to ${h}`;
    }
  }

  // 8. Last resort before a bare kind word: a meaningful id/name attribute
  //    ("#newsletter-submit" → "Newsletter submit button").
  if (kind === "button" || kind === "link") {
    const ident = attrOf(raw, "id") ?? attrOf(raw, "name");
    if (ident && !/^[0-9a-f-]{8,}$/i.test(ident)) {
      const h = humanizeSlug(ident);
      if (h && h.toLowerCase() !== kind) return `${h} ${kind}`;
    }
  }

  // 9. A custom widget role (e.g. a carousel slide) names itself.
  const roleDesc = attrOf(raw, "aria-roledescription");
  if (roleDesc) return capitalize(roleDesc.toLowerCase());

  // 10. A form field — describe its purpose, or flag a hidden one.
  if (kind === "field" || kind === "checkbox" || kind === "radio button") {
    if (attrOf(raw, "tabindex") === "-1") return "Hidden field";
    const purpose = fieldPurpose(raw, type);
    return purpose ? `${purpose} field` : capitalize(kind);
  }

  // 11. Nothing distinctive — the element type is the best we can do.
  return capitalize(kind);
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
    const ref = snippet ? `${f.selector}  —  ${snippet}` : f.selector;
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
export function FindingGroup({ findings }: { findings: AccessibilityFinding[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const rep = findings[0]; // most severe (list is pre-sorted by severity)
  const count = findings.length;
  const plain = plainForRule(rep.ruleId);
  // Deterministic findings get a plain-language title from the rule map; AI
  // findings write their own. Only fall back to the description when neither
  // exists — it's a paragraph, which reads badly as a heading.
  const title = plain?.plain ?? rep.title ?? rep.description;
  const detailsId = `a11y-group-${rep.id}`;

  // One clean instruction for the whole group — a plain rewrite when we have
  // one, otherwise the finding's own (already-plain) suggested fix.
  const whatToDo = plainFixForRule(rep.ruleId) ?? rep.suggestedFix;

  const entries = dedupeOccurrences(findings);
  const summarize = entries.length > SUMMARY_THRESHOLD;
  const visibleEntries = summarize && !showAll ? entries.slice(0, SUMMARY_THRESHOLD) : entries;

  return (
    <li className={`a11y-finding a11y-severity-${rep.severity}`}>
      <button
        type="button"
        className="a11y-finding-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        {rep.elementScreenshot && (
          <img className="a11y-finding-thumb" src={`data:image/jpeg;base64,${rep.elementScreenshot}`} alt="" />
        )}
        <span className="a11y-severity-badge">{severityLabel[rep.severity]}</span>
        <span className="a11y-finding-desc">{title}</span>
        {count > 1 && <span className="a11y-count-badge">{count}×</span>}
        {rep.wcagLevel && <span className="a11y-level-badge">{LEVEL_FRAMING[rep.wcagLevel]}</span>}
      </button>

      {expanded && (
        <div id={detailsId} className="a11y-finding-details">
          {/* Shared explanation — shown once for the whole group */}
          {plain && (
            <p className="a11y-finding-impact">
              <strong>Why this matters:</strong> {plain.impact}
            </p>
          )}
          <p>
            <strong>What to do:</strong> {whatToDo}
          </p>
          {rep.helpUrl && (
            <p>
              <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                Learn more about this issue ↗
              </a>
            </p>
          )}

          {/* Which specific elements are affected */}
          <div className="a11y-affected">
            <p className="a11y-affected-label">
              <strong>{count > 1 ? `Affected elements (${count}):` : "Affected element:"}</strong>
            </p>
            <ul className="a11y-occurrence-list">
              {visibleEntries.map((e) => (
                <Occurrence key={e.rep.id} finding={e.rep} label={e.label} repeatCount={e.count} />
              ))}
            </ul>
            {summarize && !showAll && (
              <button type="button" className="a11y-show-all" onClick={() => setShowAll(true)}>
                Show all {entries.length} kinds of element
              </button>
            )}
          </div>

          {/* Developer hand-off — the rule reference, shown once */}
          {(rep.ruleId || rep.wcagCriterion) && (
            <details className="a11y-tech-details">
              <summary>Technical details for your developer</summary>
              <p>
                <strong>What the scanner flagged:</strong> {rep.description}
              </p>
              {rep.wcagCriterion && rep.wcagCriterion !== "N/A" && (
                <p>
                  <strong>WCAG criterion:</strong> {rep.wcagCriterion}
                </p>
              )}
              {rep.ruleId && (
                <p>
                  <strong>Rule:</strong> <code>{rep.ruleId}</code>
                </p>
              )}
              <p>
                <strong>Affected {count > 1 ? "elements" : "element"}:</strong>
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
        </div>
      )}
    </li>
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
  return (
    <li className="a11y-occurrence">
      <div className="a11y-occurrence-head">
        {finding.elementScreenshot && (
          <img className="a11y-occurrence-thumb" src={`data:image/jpeg;base64,${finding.elementScreenshot}`} alt="" />
        )}
        <span className="a11y-occurrence-label">{label}</span>
        {repeatCount > 1 && <span className="a11y-occurrence-count">{repeatCount}×</span>}
      </div>
      {hasAlt && <AltTextSuggestion value={finding.suggestedAltText!} />}
    </li>
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
        <strong>Suggested alt text:</strong> This image looks decorative, so give it an <em>empty</em>{" "}
        alt text (<code>alt=""</code>) — that tells screen readers to skip it.
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
        <strong>Suggested alt text</strong> — written from the actual image:
      </p>
      <div className="a11y-alt-suggestion-value">
        <code>{value}</code>
        <button type="button" className="a11y-alt-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
