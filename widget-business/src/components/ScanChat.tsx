import { useRef, useState, type FocusEvent, type FormEvent, type MutableRefObject, type ReactNode } from "react";
import { t } from "../lib/strings";
import { getLang } from "../lib/i18n";
import { smarten } from "../lib/typography";
import { Button } from "./Button";
import { LanguageSelect } from "./LanguageSelect";
import { BlockedNotice } from "./BlockedNotice";
import type { Lang } from "../lib/i18n";
import type { AccessibilityReport, SiteAudit } from "../api/scanClient";
import {
  addressIn,
  appendUser,
  ChatError,
  ChatUnavailableError,
  sendChatTurn,
  textOf,
  unansweredToolUses,
  type ChatBlock,
  type ChatMessage,
} from "../api/chatClient";
import { digestAudit, digestReport } from "../lib/reportDigest";
import { NARRATION_STEPS, narrationIndex, narrationLabel } from "../lib/scanNarration";
import { SHOWABLE, sectionForCommand, sectionLabel, type SectionKey } from "../lib/sections";

/**
 * The whole checker, as one conversation with an assistant.
 *
 * The person says what to check. The assistant starts the scan and says so,
 * with one line per step as the pipeline crosses it, each filled in with
 * what the report found there once it lands. Every part of the report —
 * score, findings, legal checklist, statement, VPAT, simulator, settings —
 * appears in the conversation: after a scan, when asked for, or from the
 * buttons under it. (Typing /checklist and the like still works; it is no
 * longer advertised.) There is no separate report page in this reading; the
 * form keeps that one, one button away, and stays the way to scan behind a
 * login.
 *
 * A plain assistant chat, on purpose: no glyph marks and no monospace tool
 * lines, at the user's word (3 Oct 2026).
 *
 * Accessibility, decided rather than defaulted:
 *  - The thread is a plain ordered list, not a live region; streamed text
 *    in one is re-announced on every chunk. A finished reply is announced
 *    once, through the status region at the end.
 *  - Every message names its speaker in text. The step dots are decoration
 *    and hidden from assistive technology.
 *  - Each report block is a native <details>, open by default.
 *  - The composer is pinned to the bottom of the screen, and anything that
 *    takes focus underneath it is scrolled clear (WCAG 2.4.11).
 */

export type ScanOutcome =
  | { kind: "report"; report: AccessibilityReport }
  | { kind: "audit"; audit: SiteAudit }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

/** Where a streamed chunk of a reply began, and when it arrived. The
 *  chunk fades in from that point; the mark is dropped once it has. */
type Mark = { at: number; t: number };

type Turn =
  | { id: number; who: "you" | "checker"; text: string; streaming?: boolean; marks?: Mark[] }
  | { id: number; who: "scan"; url: string; state: "running" | "done" | "failed"; steps: string[]; seconds?: number; resultKey?: string }
  | { id: number; who: "block"; section: SectionKey; resultKey: string }
  | { id: number; who: "notice"; message: string };

/** What the rest of the widget may ask of the conversation: a re-run from
 *  the settings block or the top bar arrives as a scan in the thread, and
 *  the stop-press link can ask for the findings it points at. */
export interface ChatApi {
  rerun: (url: string, scope: "page" | "site", aiReview: boolean) => void;
  show: (key: SectionKey) => void;
}

/** Past this, the next message starts a fresh API conversation seeded with
 *  the latest report, rather than running into the server's caps (60
 *  messages, 400k characters) mid-turn. The thread on screen is kept. */
const MAX_HISTORY_MESSAGES = 50;
const MAX_HISTORY_CHARS = 300_000;

let nextId = 1;

/** Paragraphs, hyphen and numbered lists, fenced code blocks, **bold**,
 *  `code` and links: the formatting the model writes. Built as elements,
 *  never as HTML: the text comes from a model, and none of it should reach
 *  a parser. A link is drawn only for an http or https address.
 *
 *  A paragraph may open with a sentence and go on as a list ("Start with
 *  these three:" then the items, one newline apart). Only all-list
 *  paragraphs used to become lists, so on production those items ran
 *  inline, hyphens and all, and backticks showed as backticks.
 *
 *  Code blocks are cut out first, because the code inside may hold blank
 *  lines and list-like lines. A block still streaming in has no closing
 *  fence yet, and is drawn as code up to the end. */
export function renderReply(text: string, marks?: Mark[]): ReactNode {
  const out: ReactNode[] = [];
  splitFences(marks?.length ? withMarks(text, marks) : text).forEach((seg, s) => {
    if (seg.code !== undefined) {
      if (seg.code.trim())
        out.push(
          <pre key={`c${s}`} className="a11y-chat-pre">
            <code>{fade(seg.code.replace(/\n+$/, ""), null)}</code>
          </pre>
        );
    } else renderProse(seg.text, `t${s}`, out);
  });
  return out;
}

/** How long a chunk fades in for (matches the CSS), and so how long its
 *  mark is kept. */
export const FADE_MS = 500;

// A chunk's start is marked in the text with a private-use character, so
// the mark rides through the paragraph and list parsing untouched and is
// read back where the words are finally set. The character carries the
// mark's number, which keys the span so React keeps it — and its running
// animation — across the re-render each next chunk causes.
const MARK_BASE = 0xe000;
const SENTINEL = /([\uE000-\uEFFF])/;
const SENTINELS = /[\uE000-\uEFFF]/g;

/** The text with a sentinel at the start of each chunk. A mark that would
 *  land on a fence line, a blank line or inside a list marker is moved to
 *  the first word after it, so it never changes what the line is. */
function withMarks(text: string, marks: Mark[]): string {
  const at = new Map<number, number>();
  marks.forEach((m, i) => {
    const off = settle(text, m.at);
    if (off !== null && !at.has(off)) at.set(off, i);
  });
  let out = text;
  [...at.entries()]
    .sort((a, b) => b[0] - a[0])
    .forEach(([off, i]) => {
      out = out.slice(0, off) + String.fromCharCode(MARK_BASE + (i & 0xfff)) + out.slice(off);
    });
  return out;
}

const LEAD = /^\s*(?:[-•*]\s+|\d+[.)]\s+|#{1,6}\s+)?/;

function settle(text: string, off: number): number | null {
  for (;;) {
    if (off >= text.length) return null;
    const lineStart = text.lastIndexOf("\n", off - 1) + 1;
    const nl = text.indexOf("\n", off);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd);
    const lead = LEAD.exec(line)![0].length;
    if (FENCE.test(line) || lead === line.length) {
      off = lineEnd + 1;
      continue;
    }
    return Math.max(off, lineStart + lead);
  }
}

/** The words, with each chunk that is still arriving wrapped so it fades
 *  in. Prose is typeset (`lang`); code is not (null). */
function fade(text: string, lang: string | null): ReactNode {
  const set = (piece: string, prev: string) =>
    lang === null
      ? piece
      : prev
        ? // The piece before decides whether a quote opens or closes: a
          // space before it opens, anything else closes.
          smarten((/[\s(\[\u2013]$/.test(prev) ? " " : "x") + piece, lang).slice(1)
        : smarten(piece, lang);
  if (!SENTINEL.test(text)) return set(text, "");
  const parts = text.split(SENTINEL);
  const out: ReactNode[] = [];
  let prev = "";
  for (let i = 0; i < parts.length; i += 2) {
    const piece = parts[i];
    if (piece) {
      const typeset = set(piece, prev);
      out.push(
        i ? (
          <span key={parts[i - 1].charCodeAt(0)} className="a11y-chat-new">
            {typeset}
          </span>
        ) : (
          typeset
        )
      );
      prev = piece;
    }
  }
  return out;
}

type Segment = { text: string; code?: undefined } | { code: string; text?: undefined };

const FENCE = /^\s*```/;

function splitFences(text: string): Segment[] {
  const segs: Segment[] = [];
  let prose: string[] = [];
  let code: string[] | null = null;
  for (const line of text.split("\n")) {
    if (code === null) {
      if (FENCE.test(line)) {
        if (prose.length) segs.push({ text: prose.join("\n") });
        prose = [];
        code = [];
      } else prose.push(line);
    } else if (/^\s*```\s*$/.test(line)) {
      segs.push({ code: code.join("\n") });
      code = null;
    } else code.push(line);
  }
  if (code !== null) segs.push({ code: code.join("\n") });
  else if (prose.length) segs.push({ text: prose.join("\n") });
  return segs;
}

// **bold**, `code`, [text](https://…), and a bare https://… address. A bare
// address stops before trailing punctuation, so a sentence's full stop is
// not swallowed into the link.
const INLINE = /(\*\*[^*]+?\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/g;

function inline(line: string): ReactNode[] {
  return line.split(INLINE).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{fade(part.slice(2, -2), null)}</strong>;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={i}>{fade(part.slice(1, -1), null)}</code>;
    const md = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (md) return link(md[2], md[1], i);
    if (/^https?:\/\//.test(part)) return link(part, part, i);
    return fade(part, getLang());
  });
}

function link(href: string, label: string, key: number): ReactNode {
  return (
    <a key={key} href={href.replace(SENTINELS, "")} target="_blank" rel="noopener noreferrer">
      {fade(label, null)}
      <span className="a11y-sr-only"> {t("(opens in a new tab)")}</span>
    </a>
  );
}

const BULLET = /^\s*[-•*]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
// Headings are not asked for, but a model writes one now and then; it reads
// as a bold line rather than as hashes.
const HEADING = /^\s*#{1,6}\s+/;

function renderProse(text: string, prefix: string, out: ReactNode[]) {
  text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .forEach((para, i) => {
      let sentences: string[] = [];
      let items: string[] = [];
      let ordered = false;
      let part = 0;
      const key = () => `${prefix}.${i}.${part++}`;
      const flushText = () => {
        if (sentences.length) out.push(<p key={key()}>{inline(sentences.join(" "))}</p>);
        sentences = [];
      };
      const flushList = () => {
        if (items.length) {
          const lis = items.map((l, j) => <li key={j}>{inline(l.replace(ordered ? NUMBERED : BULLET, ""))}</li>);
          // A numbered list that resumes after a code block keeps its count.
          const start = ordered ? parseInt(items[0], 10) : 1;
          out.push(
            ordered ? (
              <ol key={key()} start={start > 1 ? start : undefined}>
                {lis}
              </ol>
            ) : (
              <ul key={key()}>{lis}</ul>
            )
          );
        }
        items = [];
      };
      for (const line of para.split("\n").filter((l) => l.trim())) {
        const isBullet = BULLET.test(line);
        const isNumbered = !isBullet && NUMBERED.test(line);
        if (HEADING.test(line)) {
          flushText();
          flushList();
          out.push(
            <p key={key()}>
              <strong>{inline(line.replace(HEADING, ""))}</strong>
            </p>
          );
        } else if (isBullet || isNumbered) {
          flushText();
          if (items.length && ordered !== isNumbered) flushList();
          ordered = isNumbered;
          items.push(line);
        } else {
          flushList();
          sentences.push(line.trim());
        }
      }
      flushText();
      flushList();
    });
}

function outcomeLine(outcome: ScanOutcome): string {
  // Whole sentences only: a line stitched from translated fragments reads
  // wrong in every language but English.
  switch (outcome.kind) {
    case "report":
      return `${t("Scan finished.")} ${t("Score")} ${outcome.report.score}/100.`;
    case "audit":
      return t("Scan finished.");
    case "blocked":
    case "error":
      return outcome.message;
  }
}

const resultKeyOf = (o: { scannedAt: string }) => o.scannedAt;

/** The incomplete-check labels (renderPage's incompleteChecks) that belong
 *  to each step's line. A step whose check did not finish says so: "Nothing
 *  found" over a check that never ran reads as a pass. */
const STEP_CHECKS: Record<string, string[]> = {
  "screen-reader": ["screen reader names"],
  keyboard: ["keyboard navigation", "mouse-only controls", "state changes", "open dialogs"],
  "text-resize": ["text resizing"],
  phone: ["phone layout", "phone-width contrast", "320px reflow"],
};

/** Findings each step produces, by rule id. The dialog rules named here are
 *  the ones the keyboard probe raises; the static dialog-* rules come from
 *  the page rules and are counted there. */
const KEYBOARD_RULES = new Set([
  "dialog-keyboard-trap",
  "dialog-no-escape",
  "dialog-focus-not-moved",
  "dialog-focus-lost-on-close",
  "activation-stale-state",
  "forced-colors-focus-lost",
  "consent-blocks-reader",
]);
const isKeyboard = (r: string) => r.startsWith("keyboard-") || KEYBOARD_RULES.has(r);
const isTextResize = (r: string) => r.startsWith("text-");
const isPhone = (r: string) => r.startsWith("mobile-") || r === "color-contrast-mobile";

/** What the report found at one step of the scan, for its line. Counts of
 *  accessibility findings, each on exactly one line — read from the report,
 *  never guessed. */
export function stepResult(step: string, report: AccessibilityReport): string | null {
  const accessibility = report.findings.filter((f) => f.category === "accessibility");
  const count = (test: (ruleId: string) => boolean) => accessibility.filter((f) => f.ruleId && test(f.ruleId)).length;
  const unfinished = (STEP_CHECKS[step] ?? []).some((c) => report.meta.incompleteChecks?.includes(c));
  const found = (n: number) =>
    unfinished
      ? n
        ? `${n} ${t("found")} · ${t("Did not finish")}`
        : t("Did not finish")
      : n
        ? `${n} ${t("found")}`
        : t("Nothing found");
  switch (step) {
    case "load": {
      // The page's own load. renderTimeMs runs to the end of every probe,
      // and a site owner reads that figure as their site being slow.
      const phases = report.meta.renderPhaseMs;
      const ms = phases ? (phases.goto ?? 0) + (phases.subresources ?? 0) : 0;
      return ms ? `${(ms / 1000).toFixed(1)}s` : null;
    }
    case "rules":
      return found(
        accessibility.filter(
          (f) => f.source === "automated" && !(f.ruleId && (isKeyboard(f.ruleId) || isTextResize(f.ruleId) || isPhone(f.ruleId)))
        ).length
      );
    case "screen-reader":
      return report.screenReaderScript ? found(report.screenReaderScript.lines.filter((l) => l.issue).length) : null;
    case "keyboard": {
      // A walk cut short by its cap is a walk that ran: "first 400 stops",
      // not "Did not finish", unless another keyboard check really did not
      // finish. spiegel.de has more stops than the cap and read as broken.
      const cut = report.meta.tabWalkStops;
      const otherUnfinished = STEP_CHECKS.keyboard
        .filter((c) => c !== "keyboard navigation")
        .some((c) => report.meta.incompleteChecks?.includes(c));
      if (unfinished && cut && !otherUnfinished) {
        const n = count(isKeyboard);
        const first = t("first {n} stops").replace("{n}", String(cut));
        return `${n ? `${n} ${t("found")}` : t("Nothing found")} · ${first}`;
      }
      return found(count(isKeyboard));
    }
    case "text-resize":
      return found(count(isTextResize));
    case "phone":
      return found(count(isPhone));
    case "ai-review": {
      const status = report.meta.aiReviewStatus;
      if (status === "completed") return found(report.findings.filter((f) => f.source === "ai-review").length);
      // Asked for, announced, and then skipped: the line must not sit there
      // looking as if it ran.
      return status === "disabled_by_request" ? null : t("Did not run");
    }
    case "report":
      return `${t("Score")} ${report.score}/100`;
    default:
      return null;
  }
}

export function ScanChat({
  apiBase,
  loading,
  milestones,
  elapsed,
  reducedMotion,
  report,
  audit,
  onScan,
  onUseForm,
  renderSection,
  availableSections,
  language,
  onLanguageChange,
  hidden = false,
  apiRef,
}: {
  apiBase: string;
  loading: boolean;
  /** Milestone ids of the running scan, in arrival order. */
  milestones: string[];
  elapsed: number;
  reducedMotion: boolean;
  report: AccessibilityReport | null;
  audit: SiteAudit | null;
  onScan: (url: string, scope: "page" | "site", aiReview: boolean) => Promise<ScanOutcome>;
  onUseForm: () => void;
  renderSection: (key: SectionKey) => ReactNode;
  availableSections: SectionKey[];
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
  /** Behind the form. Stays mounted, so the thread and the history survive
   *  the trip and a turn in flight lands where it belongs, but renders
   *  nothing — its blocks carry the same ids as the page reading. */
  hidden?: boolean;
  apiRef?: MutableRefObject<ChatApi | null>;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // The conversation in the API's shape. Append-only — see chatClient.
  const history = useRef<ChatMessage[]>([]);
  // Once the server says it has no assistant, stop asking it every turn.
  const assistantDown = useRef(false);
  // Which result the assistant has already been given, so a scan started
  // from the form reaches the conversation once and only once.
  const sharedScan = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  // Mirrors `turns` for code that runs between renders.
  const turnsRef = useRef<Turn[]>([]);

  const currentKey = report ? resultKeyOf(report) : audit ? resultKeyOf(audit) : null;
  // Read through refs by the async turn handlers: a turn's closure belongs
  // to the render it started in, which was before the report existed.
  const currentKeyRef = useRef(currentKey);
  currentKeyRef.current = currentKey;
  const availableRef = useRef(availableSections);
  availableRef.current = availableSections;
  const focusInput = () => rootRef.current?.querySelector<HTMLTextAreaElement>("#a11y-chat-input")?.focus();

  /** Back to the composer after a turn — unless focus has gone somewhere on
   *  purpose since: a block the reader was taken to, something they tabbed
   *  to during a minute-long scan, or the host page around the widget. */
  function returnFocus() {
    const root = rootRef.current;
    if (!root) return;
    const scope = root.getRootNode() as Document | ShadowRoot;
    if (scope instanceof ShadowRoot) {
      const outer = document.activeElement;
      if (outer && outer !== document.body && outer !== scope.host) return;
    }
    const active = scope.activeElement;
    if (active && active !== document.body && !dockRef.current?.contains(active)) return;
    focusInput();
  }

  const setAll = (next: Turn[]) => {
    turnsRef.current = next;
    setTurns(next);
  };
  const add = (turn: Turn) => setAll([...turnsRef.current, turn]);
  const patch = (id: number, change: Partial<Turn>) =>
    setAll(turnsRef.current.map((x) => (x.id === id ? ({ ...x, ...change } as Turn) : x)));

  /** Shows a section as a block, or — when it is already in the thread for
   *  this result — takes the reader to it. One block per section per
   *  result: the sections carry fixed ids, and a second copy would
   *  duplicate every one of them. */
  function showSection(
    key: SectionKey,
    {
      resultKey = currentKeyRef.current,
      // Past the available list: findings and the audit exist for every
      // result, before the render that would list them has happened.
      force = false,
      // Off when something else is already the announcement — the
      // assistant's reply in the same turn — so this does not talk over it.
      announce = true,
      // Off when the widget shows a block on its own account (after a
      // scan): taking the reader to it would pull focus out from under them.
      focusExisting = true,
    }: { resultKey?: string | null; force?: boolean; announce?: boolean; focusExisting?: boolean } = {}
  ): boolean {
    if (!resultKey || !(force || availableRef.current.includes(key))) return false;
    const existing = turnsRef.current.find((x) => x.who === "block" && x.section === key && x.resultKey === resultKey);
    if (existing) {
      if (!focusExisting) return true;
      const summary = rootRef.current?.querySelector<HTMLElement>(`#a11y-chat-block-${existing.id} > summary`);
      summary?.scrollIntoView({ block: "start" });
      summary?.focus();
      if (announce) setAnnouncement(`${sectionLabel(key)}: ${t("shown above.")}`);
      return true;
    }
    add({ id: nextId++, who: "block", section: key, resultKey });
    // A block that arrives in silence is invisible to a screen reader user:
    // nothing moved focus, and nothing said anything. "Above" because the
    // reader is in the composer, which every block sits above.
    if (announce) setAnnouncement(`${sectionLabel(key)}: ${t("added above.")}`);
    return true;
  }

  async function runScan(url: string, scope: "page" | "site", aiReview: boolean) {
    const turnId = nextId++;
    add({ id: turnId, who: "scan", url, state: "running", steps: [] });
    const started = Date.now();
    const outcome = await onScan(url, scope, aiReview);
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    if (outcome.kind === "report" || outcome.kind === "audit") {
      const key = outcome.kind === "report" ? resultKeyOf(outcome.report) : resultKeyOf(outcome.audit);
      // The step lines freeze at what the pipeline actually reported.
      patch(turnId, { state: "done", seconds, resultKey: key, steps: [...milestonesRef.current] });
      sharedScan.current = key;
      if (outcome.kind === "report" && outcome.report.findings.some((f) => f.ruleId === "consent-blocks-reader")) {
        add({ id: nextId++, who: "block", section: "stop", resultKey: key });
      }
    } else {
      patch(turnId, { state: "failed", seconds, steps: [...milestonesRef.current] });
      if (outcome.kind === "blocked") add({ id: nextId++, who: "notice", message: outcome.message });
    }
    return outcome;
  }

  // The milestones prop at the moment a scan settles, read from a ref so
  // the closure in runScan sees the latest list rather than its own copy.
  const milestonesRef = useRef<string[]>([]);
  milestonesRef.current = milestones;

  /** The block a finished scan opens with: the findings, or the audit. */
  function showResult(outcome: ScanOutcome) {
    // Silent: the reply or the outcome line before it is what gets read
    // out, and announcing the block would replace it in the same render.
    const quiet = { force: true, announce: false, focusExisting: false };
    if (outcome.kind === "report") {
      const key = resultKeyOf(outcome.report);
      const meta = outcome.report.meta;
      // A score with checks missing behind it arrives with the block that
      // says which: "every check that did not run must be declared".
      const aiSkipped = ["skipped_no_key", "skipped_timeout", "skipped_error"].includes(meta.aiReviewStatus);
      if (meta.incompleteChecks?.length || aiSkipped) showSection("score", { ...quiet, resultKey: key });
      showSection("findings", { ...quiet, resultKey: key });
    }
    if (outcome.kind === "audit") showSection("audit", { ...quiet, resultKey: resultKeyOf(outcome.audit) });
  }

  /** One assistant turn, and the tools it calls. A scan gets a second turn
   *  so the assistant can say what came back; a shown section does not —
   *  the block speaks for itself, and the next question picks it up. */
  async function assistantTurn(messages: ChatMessage[]) {
    const turnId = nextId++;
    add({ id: turnId, who: "checker", text: "", streaming: true });
    setAnnouncement(t("Thinking…"));

    const result = await sendChatTurn(apiBase, messages, (delta) => {
      const now = Date.now();
      setAll(
        turnsRef.current.map((x) =>
          x.id === turnId && x.who === "checker"
            ? {
                ...x,
                text: x.text + delta,
                marks: [...(x.marks ?? []).filter((m) => now - m.t < FADE_MS), { at: x.text.length, t: now }],
              }
            : x
        )
      );
    });

    // An empty reply (end_turn with no content, most often right after a
    // tool result) has no thinking to protect, and the API refuses any later
    // request carrying an empty assistant message. It is left out; the
    // history ends on the user turn, and the next message joins it.
    history.current = result.content.length ? [...messages, { role: "assistant", content: result.content }] : messages;
    // Calls the route did not hand over — a second scan in one turn, or
    // input that failed its check — are answered here, or the next request
    // is refused for good.
    const unanswered = unansweredToolUses(result.content, [
      ...result.show.map((r) => r.toolUseId),
      ...(result.scan ? [result.scan.toolUseId] : []),
    ]);
    if (unanswered.length) history.current = appendUser(history.current, unanswered);
    const text = textOf(result.content);
    if (text.trim()) {
      patch(turnId, { text, streaming: false });
      // The last chunks finish fading before their marks go.
      window.setTimeout(() => patch(turnId, { marks: undefined }), FADE_MS);
      setAnnouncement(text);
    } else {
      // A turn that is only a tool call leaves no empty "Checker" behind.
      setAll(turnsRef.current.filter((x) => x.id !== turnId));
    }

    if (result.show.length) {
      let shownAny = false;
      const results: ChatBlock[] = result.show.map((req) => {
        const key = req.section as SectionKey;
        const shown = SHOWABLE.some((s) => s.key === key) && showSection(key, { announce: !text.trim(), focusExisting: !text.trim() });
        shownAny = shownAny || shown;
        return {
          type: "tool_result",
          tool_use_id: req.toolUseId,
          content: shown ? "Shown in the conversation." : "Not available for this scan.",
          ...(shown ? {} : { is_error: true }),
        };
      });
      history.current = appendUser(history.current, results);
      // The assistant asked for a section this scan does not have. The
      // tool result tells the model, but no turn follows a shown section,
      // so the person would see nothing — and, if the assistant said
      // nothing either, hear "Thinking…" as the last word.
      if (!shownAny) {
        add({ id: nextId++, who: "checker", text: t("Not available for this scan.") });
        if (!text.trim()) setAnnouncement(t("Not available for this scan."));
      }
    } else if (!text.trim() && !result.scan) {
      // Nothing said, shown or started. Rare, but "Thinking…" cannot be
      // left standing over an empty turn.
      add({ id: nextId++, who: "checker", text: t("No reply came back. Ask again.") });
      setAnnouncement(t("No reply came back. Ask again."));
    }

    if (result.scan) {
      const outcome = await runScan(result.scan.url, result.scan.scope, result.scan.aiReview);
      const failed = outcome.kind === "blocked" || outcome.kind === "error";
      const toolResult: ChatBlock = {
        type: "tool_result",
        tool_use_id: result.scan.toolUseId,
        // A blocked scan has already put its notice on screen, with the
        // three ways in. Told that, the assistant adds a sentence; not
        // told, it wrote the same three ways out again under the notice.
        content: failed
          ? outcome.kind === "blocked"
            ? `The scan did not complete: ${outcomeLine(outcome)} The person can already see a notice with the three ways in (scan the staging site, allow the user agent A11yCheckerBot through the bot protection, or sign in with a session from the form). Do not repeat them. Reply in one short sentence, or offer to try a different address.`
            : `The scan did not complete: ${outcomeLine(outcome)}`
          : JSON.stringify(outcome.kind === "report" ? digestReport(outcome.report) : digestAudit(outcome.audit)),
        ...(failed ? { is_error: true } : {}),
      };
      // Committed before the next request, success or not: a tool call
      // without its result would make every later turn invalid.
      history.current = appendUser(history.current, [toolResult]);
      try {
        await assistantTurn(history.current);
      } catch (err) {
        // The scan finished even if the reply about it did not: say both,
        // in the one message the failure path shows and announces.
        const why = err instanceof Error ? err.message : t("The assistant could not answer that.");
        throw new ChatError(`${outcomeLine(outcome)} ${why}`, err instanceof ChatError ? err.status : undefined);
      } finally {
        // The block is the scan's, not the reply's: it is shown whether or
        // not the assistant managed to say anything about it.
        if (!failed) showResult(outcome);
      }
    }
  }

  /** No assistant on this server: scan the address if there is one, and
   *  say plainly that nothing more is on offer. */
  async function fallbackTurn(text: string) {
    const url = addressIn(text);
    if (!url) {
      const line = t("The assistant is not available on this server. Paste an address and the scan still runs.");
      add({ id: nextId++, who: "checker", text: line });
      setAnnouncement(line);
      return;
    }
    const outcome = await runScan(url, "page", false);
    const line = outcomeLine(outcome);
    add({ id: nextId++, who: "checker", text: line });
    setAnnouncement(line);
    showResult(outcome);
  }

  /** /commands: answered here, with no assistant needed. */
  function commandTurn(text: string) {
    const key = sectionForCommand(text);
    if (key && showSection(key)) return;
    const offered = SHOWABLE.filter((s) => availableRef.current.includes(s.key)).map((s) => `/${s.command}`);
    const line = currentKeyRef.current
      ? key
        ? `${t("Not available for this scan.")} ${t("Try one of these:")} ${offered.join(", ")}`
        : `${t("Try one of these:")} ${offered.join(", ")}`
      : t("Run a scan first: paste an address.");
    add({ id: nextId++, who: "checker", text: line });
    setAnnouncement(line);
  }

  /** A re-run asked for outside the thread — the settings block, the top
   *  bar. It runs as a scan turn like any other; the assistant did not start
   *  it, so the next message carries the result, as a form scan does. */
  async function rerun(url: string, scope: "page" | "site", aiReview: boolean) {
    if (busy || loading) {
      setAnnouncement(t("The assistant is still replying. Run it again in a moment."));
      return;
    }
    setBusy(true);
    try {
      const outcome = await runScan(url, scope, aiReview);
      sharedScan.current = null;
      const line = outcomeLine(outcome);
      add({ id: nextId++, who: "checker", text: line });
      setAnnouncement(line);
      showResult(outcome);
    } finally {
      setBusy(false);
      // The re-run button disables itself while the scan runs, which drops
      // focus to the page body.
      returnFocus();
    }
  }
  if (apiRef) {
    apiRef.current = {
      rerun: (url, scope, aiReview) => void rerun(url, scope, aiReview),
      show: (key) => void showSection(key, { force: true, announce: false, focusExisting: false }),
    };
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || loading) return;
    setDraft("");
    const box = rootRef.current?.querySelector<HTMLTextAreaElement>("#a11y-chat-input");
    if (box) box.style.height = "";
    add({ id: nextId++, who: "you", text });
    focusInput();

    if (text.startsWith("/")) {
      commandTurn(text);
      return;
    }

    setBusy(true);
    try {
      if (assistantDown.current) {
        await fallbackTurn(text);
        return;
      }
      // A long conversation starts over before the server's caps refuse it.
      // Nothing is edited: the old history is set aside whole, and the new
      // one opens with the latest report, below.
      if (
        history.current.length >= MAX_HISTORY_MESSAGES ||
        JSON.stringify(history.current).length > MAX_HISTORY_CHARS
      ) {
        history.current = [];
        sharedScan.current = null;
      }
      // A result the assistant has not seen — from the form, a re-run, or
      // before a fresh start — rides along with this message, once.
      const blocks: ChatBlock[] = [];
      const currentKey = currentKeyRef.current;
      if (currentKey && sharedScan.current !== currentKey) {
        blocks.push({
          type: "text",
          text: `The latest scan's report, which this conversation has not seen yet:\n${JSON.stringify(
            report ? digestReport(report) : digestAudit(audit!)
          )}`,
        });
        sharedScan.current = currentKey;
      }
      const before = history.current;
      try {
        await assistantTurn(appendUser(before, [...blocks, { type: "text", text }]));
      } catch (err) {
        // "No assistant" only when nothing of this turn reached one. After a
        // turn was committed — the reply after a scan — a failure is a
        // dropped connection: the history already ends in the scan's
        // result, so the next message resumes from there. Falling back here
        // scanned the same page again and switched the assistant off.
        if (err instanceof ChatUnavailableError && history.current === before) {
          assistantDown.current = true;
          setAll(turnsRef.current.filter((x) => !(x.who === "checker" && x.streaming)));
          await fallbackTurn(text);
          return;
        }
        // The failed turn leaves the history as it was before it, so
        // sending again does not stack two copies of the same question.
        if (history.current === before && blocks.length) sharedScan.current = null;
        // Too long for the server: the next message starts a new one.
        if (err instanceof ChatError && err.status === 413) {
          history.current = [];
          sharedScan.current = null;
        }
        const message = err instanceof Error ? err.message : t("The assistant could not answer that.");
        setAll(
          turnsRef.current.map((x) =>
            x.who === "checker" && x.streaming ? { ...x, text: message, streaming: false } : x
          )
        );
        setAnnouncement(message);
      }
    } finally {
      setBusy(false);
      returnFocus();
    }
  }

  /** WCAG 2.4.11: the pinned composer must never cover what the keyboard
   *  is on. Anything that takes focus underneath it is scrolled clear. */
  function keepFocusClear(e: FocusEvent<HTMLDivElement>) {
    const dock = dockRef.current;
    const target = e.target as HTMLElement;
    if (!dock || dock.contains(target)) return;
    const covered = target.getBoundingClientRect().bottom - dock.getBoundingClientRect().top;
    if (covered > 0) window.scrollBy({ top: covered + 16, behavior: "instant" as ScrollBehavior });
  }

  const offered = SHOWABLE.filter((s) => availableSections.includes(s.key));
  const prompt = currentKey ? t("Ask about the report, or anything else") : t("Ask anything, or name a site to check");

  if (hidden) return null;

  return (
    <div className="a11y-chat" ref={rootRef} onFocus={keepFocusClear}>
      {/* The title and the intro open an empty conversation. Once there is
          one, they would sit above it saying "New scan" over a scan that
          has run — the top bar's New scan button is the way back. The
          language switcher stays. */}
      <div className="a11y-newscan-head">
        {/* Kept in the markup and folded shut, so the first turn slides
            up under it instead of jumping; hidden from readers once gone. */}
        <div className="a11y-newscan-fold" data-gone={turns.length > 0 ? "" : undefined}>
          <div>
            <h2 className="a11y-section-title a11y-newscan-title" id="a11y-newscan-title">
              {t("New scan")}
            </h2>
          </div>
        </div>
        <LanguageSelect id="a11y-lang-form" value={language} onChange={onLanguageChange} />
      </div>
      {turns.length > 0 && (
        // role="list" said out loud: WebKit drops the list role from a list
        // drawn without markers, and the label with it.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ol className="a11y-chat-thread" role="list" aria-label={t("Conversation")}>
          {turns.map((turn) => {
            if (turn.who === "scan") {
              const running = turn.state === "running";
              const steps = running ? milestones : turn.steps;
              const current = running ? steps[steps.length - 1] : null;
              const fresh = turn.resultKey && turn.resultKey === currentKey && report;
              // One sentence per state, translated whole; the address is
              // set into it rather than stitched onto a fragment.
              const [before, after] = t(
                running ? "Checking {url}." : turn.state === "done" ? "Checked {url}." : "Could not check {url}."
              ).split("{url}");
              return (
                <li key={turn.id} className={`a11y-chat-turn a11y-chat-tool a11y-chat-scan-${turn.state}`}>
                  <p className="a11y-chat-who">{t("Assistant")}</p>
                  <div className="a11y-chat-text">
                    <p>
                      {before}
                      <span className="a11y-chat-url">{turn.url}</span>
                      {/* No seconds beside the address: the step list below
                          says where the scan is, and the number was one
                          more thing to read (user's instruction, 16 Oct 2026). */}
                      {after}
                    </p>
                  </div>
                  {steps.length > 0 && (
                    <ol className="a11y-chat-steps" role="list">
                      {NARRATION_STEPS.filter((s) => steps.includes(s.id))
                        .sort((a, b) => narrationIndex(a.id) - narrationIndex(b.id))
                        .map((s) => {
                          // A scan that failed stopped at its last step: that
                          // line says so, or "Loading your page" stands over
                          // the failure looking as if the load went fine.
                          const result = fresh
                            ? stepResult(s.id, fresh)
                            : turn.state === "failed" && s.id === steps[steps.length - 1]
                              ? t("Did not finish")
                              : null;
                          return (
                            <li
                              key={s.id}
                              className={`a11y-chat-step${s.id === current ? " a11y-chat-step-now" : ""}`}
                              aria-current={s.id === current ? "step" : undefined}
                            >
                              {narrationLabel(s.id)}
                              {result && <span className="a11y-chat-step-result"> — {result}</span>}
                            </li>
                          );
                        })}
                    </ol>
                  )}
                </li>
              );
            }
            if (turn.who === "block") {
              const fresh = turn.resultKey === currentKey;
              const body = fresh ? renderSection(turn.section) : null;
              // The stop-press is an alert, not a block to fold away.
              if (turn.section === "stop") {
                return body ? (
                  <li key={turn.id} className="a11y-chat-turn a11y-chat-stop">
                    {body}
                  </li>
                ) : null;
              }
              return (
                <li key={turn.id} className="a11y-chat-turn a11y-chat-block">
                  <details id={`a11y-chat-block-${turn.id}`} open={fresh}>
                    <summary className="a11y-chat-blockhead">
                      {sectionLabel(turn.section)}
                      {/* In the markup and hidden, not drawn by CSS: generated
                          content joins the summary's name wherever the
                          alt-text syntax for `content` is not supported. */}
                      <span className="a11y-chat-fold" aria-hidden="true">
                        <span className="a11y-chat-fold-closed">▸</span>
                        <span className="a11y-chat-fold-open">▾</span>
                      </span>
                    </summary>
                    <div className="a11y-chat-blockbody">
                      {fresh ? (
                        <>
                          {turn.section === "findings" && renderSection("protable")}
                          {body}
                        </>
                      ) : (
                        <p className="a11y-chat-stale">{t("From an earlier scan. Run it again to see it.")}</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            }
            if (turn.who === "notice") {
              return (
                <li key={turn.id} className="a11y-chat-turn">
                  <BlockedNotice message={turn.message} />
                </li>
              );
            }
            return (
              <li
                key={turn.id}
                className={`a11y-chat-turn a11y-chat-${turn.who}`}
                aria-busy={turn.who === "checker" && turn.streaming ? true : undefined}
              >
                <p className="a11y-chat-who">{turn.who === "you" ? t("You") : t("Assistant")}</p>
                <div className="a11y-chat-text">
                  {turn.who === "checker" ? (
                    turn.text ? (
                      renderReply(turn.text, turn.marks)
                    ) : (
                      <p className="a11y-chat-thinking">
                        {t("Thinking…").replace(/(…|\.{3})$/, "")}
                        {/* The points come on one by one; the word alone is read. */}
                        <span className="a11y-chat-dots" aria-hidden="true">
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </span>
                      </p>
                    )
                  ) : (
                    <p>{smarten(turn.text, getLang())}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {offered.length > 0 && (
        <div className="a11y-chat-suggest" role="group" aria-label={t("Show from the report")}>
          {offered.map((s) => (
            <button key={s.key} type="button" className="a11y-chat-chip" onClick={() => showSection(s.key)}>
              {s.label()}
            </button>
          ))}
        </div>
      )}

      <div className="a11y-chat-dock" ref={dockRef}>
        {/* An assistant's box: the prompt sits inside it as the placeholder
            and the actions sit under the text, inside the same edge. The
            label stays for the accessibility tree. Enter sends; Shift+Enter
            breaks a line; the box grows with the text. */}
        <form className="a11y-chat-composer" onSubmit={send} aria-label={t("New scan")}>
          <label className="a11y-sr-only" htmlFor="a11y-chat-input">
            {prompt}
          </label>
          <div className="a11y-chat-box">
            <textarea
              id="a11y-chat-input"
              rows={2}
              placeholder={prompt}
              value={draft}
              autoComplete="off"
              enterKeyHint="send"
              maxLength={4000}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="a11y-chat-box-row">
              <Button variant="ghost" onClick={onUseForm}>
                {t("Use the form instead")}
              </Button>
              <Button type="submit" variant="primary" disabled={busy || loading || !draft.trim()}>
                {t("Send")}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* The one place the assistant is announced from: the finished reply,
          once, or "Thinking…" while it works. Mounted from the start, so
          the first change is heard. */}
      <p className="a11y-sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}
