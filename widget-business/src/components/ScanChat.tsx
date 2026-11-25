import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type MutableRefObject, type ReactNode } from "react";
import { t, tf } from "../lib/strings";
import { getLang } from "../lib/i18n";
import { CAPS_RUN, smarten } from "../lib/typography";
import { Button } from "./Button";
import { LanguageMenu } from "./LanguageMenu";
import { BlockedNotice } from "./BlockedNotice";
import { VoiceControl } from "./VoiceControl";
import type { Lang } from "../lib/i18n";
import type { AccessibilityReport, SiteAudit } from "../api/scanClient";
import {
  addressIn,
  appendUser,
  beforeLastAnswer,
  ChatError,
  ChatUnavailableError,
  sendChatTurn,
  sourcesOf,
  textOf,
  unansweredToolUses,
  type ChatBlock,
  type ChatMessage,
  type ChatSource,
} from "../api/chatClient";
import { digestAudit, digestReport } from "../lib/reportDigest";
import { NARRATION_STEPS, narrationIndex, narrationLabel } from "../lib/scanNarration";
import { SHOWABLE, sectionForCommand, sectionLabel, type SectionKey } from "../lib/sections";
import { pickOpeningPrompts, OPENING_PROMPTS } from "../lib/openingPrompts";
import { CRITERIA, criterionFor } from "../lib/promptCriteria";
import { addressToConfirm, tabSuggestion } from "../lib/chatSuggest";
import { planSteps } from "../lib/testPlan";
import {
  deleteChat,
  historyFromTurns,
  loadChats,
  newChatId,
  saveChat,
  settleTurn,
  titleOf,
  CHAT_ARCHIVE_KEY,
  type SavedChat,
} from "../lib/chatArchive";
import {
  chatUsesResult,
  deleteChatResult,
  getChatResult,
  pruneChatResults,
  putChatResult,
  type ChatResult,
} from "../lib/chatResults";
import { Icon } from "./Icon";

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

/** A reply while it streams may be out on the web: `searching` is set while
 *  a search runs (null until its query is known), and cleared by the next
 *  words. `sources` are the pages the finished reply cites. */
type Turn =
  | {
      id: number;
      who: "you" | "checker";
      text: string;
      streaming?: boolean;
      marks?: Mark[];
      searching?: string | null;
      sources?: ChatSource[];
    }
  | { id: number; who: "scan"; url: string; state: "running" | "done" | "failed"; steps: string[]; seconds?: number; resultKey?: string }
  | { id: number; who: "block"; section: SectionKey; resultKey: string }
  | { id: number; who: "notice"; message: string };

/** What the rest of the widget may ask of the conversation: a re-run from
 *  the settings block or the top bar arrives as a scan in the thread, and
 *  the stop-press link can ask for the findings it points at. */
export interface ChatApi {
  rerun: (url: string, scope: "page" | "site", aiReview: boolean) => void;
  show: (key: SectionKey) => void;
  /** A question from a report block in the thread (Learn more), with the
   *  help page it came from shown as the reply's source. */
  ask: (text: string, source: ChatSource) => void;
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
      if (seg.code.trim()) out.push(<CodeCard key={`c${s}`} code={seg.code.replace(/\n+$/, "")} />);
    } else renderProse(seg.text, `t${s}`, out);
  });
  return out;
}

/** A fenced block as a card to copy from (user's instruction, 22 Nov 2026,
 *  "make this into copy form in a card with small text"): the assistant
 *  writes templates to fill in, such as an issue report, and these were
 *  27px monospace running the thread's full width. The card is the tile
 *  ground with the text at 15px and Copy at its top; Copy takes the code
 *  without the streaming marks, so what pastes is what was written. */
function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code.replace(SENTINELS, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is on screen to select by hand.
    }
  }
  return (
    <div className="a11y-chat-copy">
      <div className="a11y-chat-copy-bar">
        <button type="button" className="a11y-chat-copy-btn" onClick={copy}>
          {copied ? t("Copied") : t("Copy")}
        </button>
      </div>
      <pre className="a11y-chat-pre">
        <code>{fade(code, null)}</code>
      </pre>
      {/* The button's own text changing is not reliably announced; this
          mounted status region is. */}
      <span className="a11y-sr-only" role="status">
        {copied ? t("Copied to clipboard") : ""}
      </span>
    </div>
  );
}

/** How long a chunk fades in for (matches the CSS), and so how long its
 *  mark is kept. */
export const FADE_MS = 500;

/** A line for a wait, with the points coming on one by one. The sentence
 *  ends in an ellipsis; the points stand in for it, and only the words are
 *  read out. */
function waiting(label: ReactNode): ReactNode {
  return (
    <p className="a11y-chat-thinking">
      {label}
      <span className="a11y-chat-dots" aria-hidden="true">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </p>
  );
}

/** "Searching the web for {query}" with the query set into the translated
 *  sentence, or the sentence without it while the query is still coming. */
function searchingLine(query: string | null): ReactNode {
  if (query === null) return t("Searching the web…").replace(/(…|\.{3})$/, "");
  const [before, after] = t("Searching the web for {query}…").replace(/(…|\.{3})$/, "").split("{query}");
  return urlInSentence(before, query, after);
}

/** An address set into its translated sentence. The address may break at
 *  any character (a long one must fit 320px), and that let the line break
 *  between its last letter and the full stop after it, so "Checking
 *  https://example.com." left the stop alone at the start of the next line
 *  ("whats this dot", 21 Nov 2026). The last letter and the punctuation that
 *  closes on it are held together; the rest of the address still breaks. */
function urlInSentence(before: string, url: string, after: string): ReactNode {
  const close = after.match(/^\p{P}+/u)?.[0];
  if (!close || url.length < 2) {
    return (
      <>
        {before}
        <span className="a11y-chat-url">{url}</span>
        {after}
      </>
    );
  }
  return (
    <>
      {before}
      <span className="a11y-chat-url">{url.slice(0, -1)}</span>
      <span className="a11y-chat-url-end">
        <span className="a11y-chat-url">{url.slice(-1)}</span>
        {close}
      </span>
      {after.slice(close.length)}
    </>
  );
}

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
/** Runs of capitals in prose (WCAG, ARIA, AA) set a size smaller and
 *  evenly spaced, the way Hochuli sets an abbreviation (p.39–40, fig. 54):
 *  they stop shouting in the line. Words stay whole; only the run is wrapped. */
function capsWrap(text: string): ReactNode {
  const parts = text.split(CAPS_RUN);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} className="a11y-caps">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function fade(text: string, lang: string | null): ReactNode {
  const set = (piece: string, prev: string): ReactNode =>
    lang === null
      ? piece
      : capsWrap(
          prev
            ? // The piece before decides whether a quote opens or closes: a
              // space before it opens, anything else closes.
              smarten((/[\s(\[\u2013\u2014]$/.test(prev) ? " " : "x") + piece, lang).slice(1)
            : smarten(piece, lang)
        );
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

// **bold**, *emphasis*, `code`, [text](https://…), and a bare https://…
// address. A bare address stops before trailing punctuation, so a
// sentence's full stop is not swallowed into the link. Single-star
// emphasis asks for an italic, which Jokker does not have (a sloped roman
// is not one, Hochuli p.41–44), so its words are set plain and the stars
// dropped: the statement's note showed them as "*Note: …*".
const INLINE = /(\*\*[^*]+?\*\*|(?<![\p{L}\p{N}*])\*(?![\s*])[^*\n]+?(?<![\s*])\*(?![\p{L}\p{N}*])|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/gu;

function inline(line: string): ReactNode[] {
  return line.split(INLINE).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{fade(part.slice(2, -2), null)}</strong>;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) return fade(part.slice(1, -1), getLang());
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
        const plan = ordered ? planSteps(items) : null;
        if (plan) {
          // A test plan: one tile per step. Still an ordered list, so a
          // reader hears how many steps there are; the figure is drawn as
          // text so it is read with the step.
          out.push(
            <ol key={key()} className="a11y-chat-plan" role="list">
              {plan.map((step, j) => (
                <li key={j} className="a11y-chat-plan-step">
                  <span className="a11y-chat-plan-no">{step.number}</span>
                  <strong className="a11y-chat-plan-title">{inline(step.title)}</strong>
                  {step.body && <span className="a11y-chat-plan-text">{inline(step.body)}</span>}
                </li>
              ))}
            </ol>
          );
        } else if (items.length) {
          const lis = items.map((l, j) => <li key={j}>{inline(l.replace(ordered ? NUMBERED : BULLET, ""))}</li>);
          // A numbered list that resumes after a code block keeps its count.
          const start = ordered ? parseInt(items[0], 10) : 1;
          out.push(
            ordered ? (
              <ol key={key()} role="list" start={start > 1 ? start : undefined}>
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
        } else if (items.length && /^\s{2,}\S/.test(line)) {
          // An indented line under a list item carries on that item (a
          // step's instruction set under its name).
          items[items.length - 1] += " " + line.trim();
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
        ? `${n} ${t("found")} — ${t("Did not finish")}`
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
        return `${n ? `${n} ${t("found")}` : t("Nothing found")} — ${first}`;
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
  onSignInForm,
  onReportBarrier,
  barrier = null,
  onLeaveBarrier,
  renderSection,
  availableSections,
  language,
  onLanguageChange,
  hidden = false,
  apiRef,
  resultPrivate = false,
  onRestore,
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
  /** Opens the scan form, the one way to scan behind a login: a password
   *  typed into the chat would pass through the model. */
  onSignInForm: () => void;
  /** Opens Report a barrier, the assistive-technology pilot's conversation.
   *  Optional: without it the panel shows no entry for it. */
  onReportBarrier?: () => void;
  /** Report a barrier, open: it takes the conversation's place inside the
   *  chat (user's instruction, 20 Nov 2026, "add this feature to main chat
   *  scan"), so the Conversations panel and the language stay beside it,
   *  and the thread underneath is kept for the way back. */
  barrier?: ReactNode;
  /** Closes Report a barrier. New chat and a past conversation call it, so
   *  they show the thread they open instead of leaving the barrier on top. */
  onLeaveBarrier?: () => void;
  renderSection: (key: SectionKey) => ReactNode;
  availableSections: SectionKey[];
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
  /** Behind the form. Stays mounted, so the thread and the history survive
   *  the trip and a turn in flight lands where it belongs, but renders
   *  nothing — its blocks carry the same ids as the page reading. */
  hidden?: boolean;
  apiRef?: MutableRefObject<ChatApi | null>;
  /** The result on screen came from a scan behind a login: it describes a
   *  private page and is never stored with a conversation. */
  resultPrivate?: boolean;
  /** Puts a reopened conversation's result back on screen, without
   *  scanning again. */
  onRestore?: (result: ChatResult) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  // The opening questions: drawn fresh on every load, one from each group,
  // each in a different layout (user's instruction, 4 Nov 2026).
  const [picks, setPicks] = useState(() => pickOpeningPrompts());
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  /** Where the reader was before the conversation took them to a block:
   *  the scroll position and what had focus. While it is set, the dock
   *  offers Back, to return to where they were before the block opened. */
  const [backTo, setBackTo] = useState<{ y: number; el: HTMLElement | null } | null>(null);
  /** A block just added at the reader's request, to take focus once it is
   *  in the thread: the chip that asked for it is gone by then. */
  const focusBlock = useRef<number | null>(null);
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
  /** The conversations panel: past threads kept in this browser
   *  (lib/chatArchive.ts), and which one is on screen. A thread gets its id
   *  with its first question, so an empty one is never listed. */
  const [chats, setChats] = useState<SavedChat[]>(() => loadChats());
  const [chatId, setChatId] = useState<string | null>(null);
  /** On a phone the panel is folded behind a toggle; on a wider screen it
   *  is always open and the toggle is not drawn. */
  const [panelOpen, setPanelOpen] = useState(false);
  /** The thread just opened from the panel: saving it again unchanged
   *  would move it to the top as if it had been added to. */
  const opened = useRef<Turn[] | null>(null);
  /** The conversation last opened from the panel, for its result arriving
   *  from IndexedDB after the reader has moved on. */
  const openingId = useRef<string | null>(null);

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

  /** Remembers where the reader is, so Back can return them there. */
  function markBack() {
    const scope = rootRef.current?.getRootNode() as Document | ShadowRoot | undefined;
    const active = scope?.activeElement as HTMLElement | null | undefined;
    // A control that is about to vanish (a chip for the section being
    // shown) is no place to come back to: the composer is.
    const el = active && !active.closest(".a11y-chat-suggest") ? active : null;
    setBackTo({ y: window.scrollY, el });
  }

  function goBack() {
    const target = backTo;
    setBackTo(null);
    if (!target) return;
    window.scrollTo({ top: target.y, behavior: "instant" as ScrollBehavior });
    if (target.el && target.el.isConnected) target.el.focus({ preventScroll: true });
    else focusInput();
  }

  // Keeps the thread on screen in the panel. A new conversation gets its
  // row the moment its first question is asked, streaming or not, so the
  // open chat is always in the list and marked (user's report, 18 Nov 2026:
  // "its not showing current chat in row"; it used to wait for the first
  // reply, and a scan's reply can take a minute). After that, not while a
  // reply streams: every chunk is a render, and the finished reply is
  // saved once.
  useEffect(() => {
    if (turns === opened.current) return;
    if (!turns.some((x) => x.who === "you")) return;
    if (chatId && turns.some((x) => x.who === "checker" && x.streaming)) return;
    const id = chatId ?? newChatId();
    if (!chatId) setChatId(id);
    setChats((list) => {
      const previous = list.find((c) => c.id === id);
      const kept = saveChat(list, {
        id,
        title: titleOf(turns),
        updatedAt: new Date().toISOString(),
        turns: turns.map(settleTurn),
        resultKey: storedResult.current.get(id) ?? previous?.resultKey,
      });
      void pruneChatResults(new Set(kept.map((c) => c.id)));
      return kept;
    });
  }, [turns, chatId]);

  /** Which result each conversation has stored, so it is written once and
   *  not on every turn. */
  const storedResult = useRef(new Map<string, string>());
  // Keeps the result on screen with the conversation that is about it
  // (lib/chatResults.ts), so reopening it brings the report back too.
  useEffect(() => {
    if (!chatId || !currentKey || resultPrivate) return;
    if (storedResult.current.get(chatId) === currentKey) return;
    if (!chatUsesResult(turns, sharedScan.current, currentKey)) return;
    const result: ChatResult | null = report
      ? { kind: "report", report }
      : audit
        ? { kind: "audit", audit }
        : null;
    if (!result) return;
    storedResult.current.set(chatId, currentKey);
    void putChatResult(chatId, result);
    setChats((list) =>
      list.some((c) => c.id === chatId && c.resultKey !== currentKey)
        ? saveChat(
            list,
            { ...list.find((c) => c.id === chatId)!, resultKey: currentKey }
          )
        : list
    );
  }, [turns, chatId, currentKey, report, audit, resultPrivate]);

  // Another tab of the widget saved or deleted a conversation: the panel
  // follows, so it never writes an old list back over the new one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_ARCHIVE_KEY) setChats(loadChats());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Clears the screen for a new conversation; the old one stays listed. */
  function newChat() {
    opened.current = null;
    openingId.current = null;
    setChatId(null);
    setAll([]);
    history.current = [];
    sharedScan.current = null;
    setBackTo(null);
    setDraft("");
    setPicks((last) => pickOpeningPrompts(Math.random, last));
    setPanelOpen(false);
    onLeaveBarrier?.();
    focusInput();
  }

  /** Puts a past conversation back on screen. Its turns take fresh ids, so
   *  they cannot meet a block id of this session's. The API history is
   *  rebuilt from its words; the latest report rides along with the next
   *  question, as after any fresh start. */
  function openChat(chat: SavedChat) {
    onLeaveBarrier?.();
    if (chat.id === chatId) return;
    const restored = (chat.turns as Turn[]).map((x) => ({ ...settleTurn(x), id: nextId++ }) as Turn);
    opened.current = restored;
    openingId.current = chat.id;
    setChatId(chat.id);
    // Its report comes back with it, when it is not the one on screen
    // already. Read from IndexedDB, so it lands a moment later; by then the
    // reader may have opened another conversation, which then wins.
    if (chat.resultKey) storedResult.current.set(chat.id, chat.resultKey);
    if (chat.resultKey && chat.resultKey !== currentKeyRef.current && onRestore) {
      void getChatResult(chat.id).then((result) => {
        if (result && openingId.current === chat.id) onRestore(result);
      });
    }
    setAll(restored);
    history.current = historyFromTurns(restored);
    sharedScan.current = null;
    setBackTo(null);
    setPanelOpen(false);
    focusInput();
  }

  function removeChat(chat: SavedChat) {
    setChats((list) => deleteChat(list, chat.id));
    storedResult.current.delete(chat.id);
    void deleteChatResult(chat.id);
    if (chat.id === chatId) newChat();
  }

  useEffect(() => {
    const id = focusBlock.current;
    if (id === null) return;
    focusBlock.current = null;
    const summary = blockTarget(id);
    summary?.scrollIntoView({ block: "start" });
    summary?.focus({ preventScroll: true });
  }, [turns]);

  /** Where a block takes focus: its first heading (made focusable for the
   *  purpose), or the block itself when it has none. Blocks have no fold
   *  line since 22 Nov 2026. */
  function blockTarget(id: number): HTMLElement | null {
    const block = rootRef.current?.querySelector<HTMLElement>(`#a11y-chat-block-${id}`);
    if (!block) return null;
    const target = block.querySelector<HTMLElement>("h2, h3") ?? block;
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    return target;
  }

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
      // On when the reader asked for it themselves (a chip): a new block
      // takes focus, and Back returns them to where they were.
      takeFocus = false,
    }: { resultKey?: string | null; force?: boolean; announce?: boolean; focusExisting?: boolean; takeFocus?: boolean } = {}
  ): boolean {
    if (!resultKey || !(force || availableRef.current.includes(key))) return false;
    const existing = turnsRef.current.find((x) => x.who === "block" && x.section === key && x.resultKey === resultKey);
    if (existing) {
      if (!focusExisting) return true;
      markBack();
      const summary = blockTarget(existing.id);
      summary?.scrollIntoView({ block: "start" });
      summary?.focus();
      if (announce) setAnnouncement(`${sectionLabel(key)}: ${t("shown above.")}`);
      return true;
    }
    const id = nextId++;
    if (takeFocus) {
      markBack();
      focusBlock.current = id;
    }
    add({ id, who: "block", section: key, resultKey });
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
      if (outcome.kind === "report") {
        // The score and its dial are the first thing a completed scan shows,
        // straight under the scan line and before the assistant's reply
        // (user's instruction, 4 Nov 2026). It used to show only when checks
        // were missing behind it; that block still says which did not run.
        // Silent, like every block the widget adds on its own account.
        // A banner that hides the page from screen readers comes first,
        // before the score: the report leads with what to fix (reviewer's
        // note, 22 Nov 2026), and the score block's own lead steps aside
        // for it (computeFirstFix).
        if (outcome.report.findings.some((f) => f.ruleId === "consent-blocks-reader")) {
          add({ id: nextId++, who: "block", section: "stop", resultKey: key });
        }
        showSection("score", { resultKey: key, force: true, announce: false, focusExisting: false });
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

  /** The blocks a finished scan opens with: the score dial first, then the
   *  findings; or the audit. */
  function showResult(outcome: ScanOutcome) {
    // Silent: the reply or the outcome line before it is what gets read
    // out, and announcing the block would replace it in the same render.
    const quiet = { force: true, announce: false, focusExisting: false };
    if (outcome.kind === "report") {
      const key = resultKeyOf(outcome.report);
      // The score block is already in the thread: runScan shows it the
      // moment the scan completes. This only lands it on a path that
      // skipped that (a no-op when it is there).
      showSection("score", { ...quiet, resultKey: key });
      showSection("findings", { ...quiet, resultKey: key });
    }
    if (outcome.kind === "audit") showSection("audit", { ...quiet, resultKey: resultKeyOf(outcome.audit) });
  }

  /** One assistant turn, and the tools it calls. Only a failed scan gets a
   *  second turn, to say what went wrong or offer another address; a
   *  finished scan and a shown section do not: the blocks speak for
   *  themselves, and the next question picks them up. */
  async function assistantTurn(messages: ChatMessage[], source?: ChatSource) {
    const turnId = nextId++;
    add({ id: turnId, who: "checker", text: "", streaming: true });
    setAnnouncement(t("Thinking…"));

    const result = await sendChatTurn(apiBase, messages, {
      onDelta: (delta) => {
        const now = Date.now();
        setAll(
          turnsRef.current.map((x) =>
            x.id === turnId && x.who === "checker"
              ? {
                  ...x,
                  text: x.text + delta,
                  marks: [...(x.marks ?? []).filter((m) => now - m.t < FADE_MS), { at: x.text.length, t: now }],
                  // Words after a search mean the search is over.
                  searching: undefined,
                }
              : x
          )
        );
      },
      onSearching: (query) => {
        patch(turnId, { searching: query });
        // Said once per search, when it starts; the query that follows is
        // shown, not announced, so the reader is not read two lines.
        if (query === null) setAnnouncement(t("Searching the web…"));
      },
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
      const cited = sourcesOf(result.content);
      const sources = source ? [source, ...cited.filter((s) => s.url !== source.url)] : cited;
      patch(turnId, { text, streaming: false, searching: undefined, sources });
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
      // A finished scan gets no reply (user's instruction, 25 Nov 2026,
      // "delete this chapter", on the paragraph that retold the score and
      // the first findings over the blocks that show them). The result
      // stays in the history, and the next question joins that user turn.
      if (!failed) {
        showResult(outcome);
        return;
      }
      try {
        await assistantTurn(history.current);
      } catch (err) {
        // The scan failed and the reply about it did too: say both, in the
        // one message the failure path shows and announces.
        const why = err instanceof Error ? err.message : t("The assistant couldn't answer that.");
        throw new ChatError(`${outcomeLine(outcome)} ${why}`, err instanceof ChatError ? err.status : undefined);
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

  /** The criterion number on an opening card, pressed: the question and a
   *  short answer from the conformance table, set in the thread at once.
   *  Nothing goes to the assistant, so it works with no scan and no key. */
  function explainCriterion(id: string) {
    const c = CRITERIA[id];
    if (!c || busy || loading) return;
    setBackTo(null);
    add({ id: nextId++, who: "you", text: tf("What does WCAG {id} ask for?", { id }) });
    const line = tf("**{id} {name}**, level {level}. The question it asks: {plain}", {
      id,
      name: c.name,
      level: c.level,
      plain: c.plain[getLang()] ?? c.plain.en,
    });
    add({ id: nextId++, who: "checker", text: line });
    setAnnouncement(line.replace(/\*\*/g, ""));
    focusInput();
  }

  /** A re-run asked for outside the thread — the settings block, the top
   *  bar. It runs as a scan turn like any other; the assistant did not start
   *  it, so the next message carries the result, as a form scan does. */
  async function rerun(url: string, scope: "page" | "site", aiReview: boolean) {
    if (busy || loading) {
      setAnnouncement(t("The assistant is still replying. Send it again in a moment."));
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
      ask: (text, source) => {
        // Mid-reply the question waits in the box, to send when the reader
        // is ready, rather than being dropped.
        if (busy || loading) {
          setDraft(text);
          focusInput();
          return;
        }
        void ask(text, source);
      },
    };
  }

  // The last finished reply, the address it asks about, and the line Tab
  // would fill in (lib/chatSuggest).
  const lastTurn = turns[turns.length - 1];
  const lastReplyId = lastTurn && lastTurn.who === "checker" ? lastTurn.id : null;
  const confirmAddress =
    lastTurn && lastTurn.who === "checker" && !lastTurn.streaming && lastTurn.text ? addressToConfirm(lastTurn.text) : null;
  const allPrompts = OPENING_PROMPTS.flatMap((g) => g.prompts.map((q) => t(q)));
  const suggestion =
    busy || loading
      ? null
      : tabSuggestion(draft, {
          confirmReply: confirmAddress ? tf("Yes, check {url}", { url: confirmAddress }) : null,
          prompts: allPrompts,
        });

  /** A bare address sent from the opening screen: a scan turn with no
   *  assistant in between, like a re-run. The assistant has not seen the
   *  result, so the next question carries it, as after a form scan. */
  async function scanAddress(url: string) {
    setBackTo(null);
    add({ id: nextId++, who: "you", text: url });
    setBusy(true);
    try {
      const outcome = await runScan(url, "page", true);
      sharedScan.current = null;
      const line = outcomeLine(outcome);
      add({ id: nextId++, who: "checker", text: line });
      setAnnouncement(line);
      showResult(outcome);
    } finally {
      setBusy(false);
      returnFocus();
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || loading) return;
    setDraft("");
    const box = rootRef.current?.querySelector<HTMLTextAreaElement>("#a11y-chat-input");
    if (box) box.style.height = "";
    // One box for both (user's instruction, 22 Nov 2026, "merge inputs"):
    // on the opening screen a message that is only an address scans
    // straight away, as the separate address field did; anything else, or
    // an address with words around it, goes to the assistant.
    const url = /\s/.test(text) || text.startsWith("/") ? null : addressIn(text);
    if (url && turns.length === 0 && !currentKeyRef.current) {
      await scanAddress(url);
      return;
    }
    await ask(text);
  }

  /** One message from the reader, typed or picked from the opening prompts:
   *  both go the same way, so a prompt is exactly what typing it would be. */
  async function ask(text: string, source?: ChatSource) {
    if (!text || busy || loading) return;
    // A new question moves the conversation on; there is nowhere to go back to.
    setBackTo(null);
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
      // Learn more names the help page it stood for, so the reply can draw
      // on it; the reader's own line stays the question alone.
      if (source) {
        blocks.push({
          type: "text",
          text: `The reader pressed Learn more on this item of the report. Its help page is ${source.url}, which is not a site to scan: explain the item in plain words, and read that page with web search if it helps.`,
        });
      }
      const before = history.current;
      try {
        await assistantTurn(appendUser(before, [...blocks, { type: "text", text }]), source);
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
        const message = err instanceof Error ? err.message : t("The assistant couldn't answer that.");
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

  /** A switch of language re-answers the latest reply in the new one (user's
   *  report, 20 Nov 2026: switched to Deutsch, and the answer on screen
   *  stayed English). The language only rode with the next question, so the
   *  reader saw German controls around an English answer and nothing to say
   *  the switch had worked. Only a plain last answer is redone: the history
   *  must end on it, and it must be the last thing in the thread, so a shown
   *  section, a scan underway or a failed turn is left as it is. Earlier
   *  answers stay in the language they were written in. */
  const answeredIn = useRef(language);
  useEffect(() => {
    if (answeredIn.current === language) return;
    answeredIn.current = language;
    if (busy || loading || assistantDown.current) return;
    const before = beforeLastAnswer(history.current);
    const lastTurn = turnsRef.current[turnsRef.current.length - 1];
    if (!before) return;
    if (!lastTurn || lastTurn.who !== "checker" || lastTurn.streaming || !lastTurn.text.trim()) return;
    setAll(turnsRef.current.slice(0, -1));
    setBusy(true);
    void (async () => {
      try {
        await assistantTurn(before);
      } catch (err) {
        // The question stays in the history, so the next message carries it.
        history.current = before;
        const message = err instanceof Error ? err.message : t("The assistant couldn't answer that.");
        setAll(
          turnsRef.current.map((x) => (x.who === "checker" && x.streaming ? { ...x, text: message, streaming: false } : x))
        );
        setAnnouncement(message);
      } finally {
        setBusy(false);
      }
    })();
    // Runs on a switch of language only; the rest is read when it happens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  /** WCAG 2.4.11: the pinned composer must never cover what the keyboard
   *  is on. Anything that takes focus underneath it is scrolled clear.
   *  Keyboard focus only (:focus-visible): a press focuses its control too,
   *  and scrolling on that moved the control out from under the pointer
   *  between press and release, so the click never landed. The criterion
   *  number at the foot of an opening card, beside the composer, did
   *  nothing when pressed until this (18 Nov 2026). */
  function keepFocusClear(e: FocusEvent<HTMLDivElement>) {
    const dock = dockRef.current;
    const target = e.target as HTMLElement;
    if (!dock || dock.contains(target)) return;
    if (!target.matches(":focus-visible")) return;
    const covered = target.getBoundingClientRect().bottom - dock.getBoundingClientRect().top;
    if (covered > 0) window.scrollBy({ top: covered + 16, behavior: "instant" as ScrollBehavior });
  }

  // A section already in the thread for this result is not offered again:
  // its block is above, with its own fold, and the row only offers what is
  // still to see.
  const offered = SHOWABLE.filter(
    (s) =>
      availableSections.includes(s.key) &&
      !turns.some((x) => x.who === "block" && x.section === s.key && x.resultKey === currentKey)
  );
  // On the opening screen the box is the one way in, for an address or a
  // question alike (user's instruction, 22 Nov 2026, "merge inputs").
  const prompt = currentKey
    ? t("Ask about the report, or anything else")
    : turns.length === 0 && !barrier
      ? t("Enter a website address, or ask a question")
      : t("Ask anything, or name a site to check");

  if (hidden) return null;

  // Switching threads mid-turn would land the reply in the wrong one.
  const switchLocked = busy || loading;

  return (
    <div className="a11y-chat-layout">
      {/* The conversations panel, on the left (user's
          instruction, 18 Nov 2026). A second navigation beside the report's
          Sections rail, but the two never show together: this one lives in
          the chat, the rail in the form's report. */}
      <nav className="a11y-chats" aria-label={t("Conversations")} data-open={panelOpen ? "" : undefined}>
        <button
          type="button"
          className="a11y-chats-toggle"
          aria-expanded={panelOpen}
          aria-controls="a11y-chats-body"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <Icon name="menu" size={20} />
          {t("Conversations")}
        </button>
        <div className="a11y-chats-body" id="a11y-chats-body">
        {/* No icons (user's instruction, 23 Nov 2026, "delete icons, make
            buttons look like this"): the words alone, in a button sized to
            them, New chat and Report a barrier side by side. */}
        <button type="button" className="a11y-chats-new" onClick={newChat} disabled={switchLocked}>
          {t("New chat")}
        </button>
        {/* Report a barrier sits under New chat, the panel's other way to
            start something (user's instruction, 20 Nov 2026). */}
        {onReportBarrier && (
          <button type="button" className="a11y-chats-new a11y-chats-barrier" onClick={onReportBarrier} disabled={switchLocked}>
            {t("Report a barrier")}
          </button>
        )}
        {chats.length > 0 && (
          <>
            {/* The label is for screen readers only (user's instruction, 25
                Nov 2026, "delete recent"): it still names the list. */}
            <h2 className="a11y-chats-head a11y-sr-only" id="a11y-chats-head">
              {t("Recent")}
            </h2>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul className="a11y-chats-list" role="list" aria-labelledby="a11y-chats-head">
              {chats.map((c) => (
                <li key={c.id} className="a11y-chats-row" data-current={c.id === chatId ? "" : undefined}>
                  <button
                    type="button"
                    className="a11y-chats-item"
                    aria-current={c.id === chatId ? "page" : undefined}
                    disabled={switchLocked && c.id !== chatId}
                    onClick={() => openChat(c)}
                  >
                    <span className="a11y-chats-title">{c.title}</span>
                    {/* The open conversation's small pill (user's
                        reference, 25 Nov 2026, a menu's "New" pill beside
                        its line). aria-current already says it. */}
                    {c.id === chatId && <span className="a11y-chats-open" aria-hidden="true">{t("Open")}</span>}
                  </button>
                  <button
                    type="button"
                    className="a11y-chats-delete"
                    aria-label={tf("Delete {title}", { title: c.title })}
                    disabled={switchLocked && c.id === chatId}
                    onClick={() => removeChat(c)}
                  >
                    {/* A trash-can drawn on a 32px grid (user's instruction, 18 Nov 2026). */}
                    <Icon name="trash-can" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        </div>
        {/* The language, the panel's last row at the foot of the column
            (user's instruction, 22 Nov 2026), outside the folding body so
            it stays beside the Conversations toggle on a phone. It was a
            button pinned at the conversation's top right from 21 Nov. */}
        <div className="a11y-chats-foot">
          <LanguageMenu value={language} onChange={onLanguageChange} />
        </div>
      </nav>
    <div className="a11y-chat" ref={rootRef} onFocus={keepFocusClear}>
      {/* The title and the intro open an empty conversation. Once there is
          one, they would sit above it saying "New scan" over a scan that
          has run — the top bar's New scan button is the way back. */}
      <div className="a11y-newscan-head">
        {/* Kept in the markup and folded shut, so the first turn slides
            up under it instead of jumping; hidden from readers once gone. */}
        <div className="a11y-newscan-fold" data-gone={turns.length > 0 || barrier ? "" : undefined}>
          <div>
            <h2 className="a11y-section-title a11y-newscan-title" id="a11y-newscan-title">
              {t("New scan")}
            </h2>
            {/* No address field here: the box below takes an address or a
                question (user's instruction, 22 Nov 2026, "merge inputs";
                a separate field and "Check this site" stood here that day). */}
          </div>
        </div>
      </div>
      {/* The opening questions as cards (user's reference, 18 Nov 2026):
          a tall pale card per group, the group as its name top-left with
          the question under it, and at the foot the WCAG criterion the
          question checks in a marker highlight (it replaced a big question
          mark the same day). The question covers the whole card and sends
          itself as if typed; hover and focus turn the card solid black with
          white words and show a pill that says what a press does. The
          number is its own button and puts what the criterion asks in the
          thread. They go once the conversation starts. */}
      {barrier}
      {!barrier && turns.length === 0 && (
        <section className="a11y-prompts" aria-label={t("Questions to start with")}>
          <div className="a11y-prompt-grid">
          {picks.map((p) => {
            const crit = criterionFor(p.prompt);
            return (
              // The card is a frame, not the button: it holds two controls,
              // the question (stretched over the whole card) and the
              // criterion number, and a button may not hold a button.
              <div key={p.group} className="a11y-prompt">
                <button
                  type="button"
                  className="a11y-prompt-q"
                  disabled={busy || loading}
                  onClick={() => void ask(t(p.prompt))}
                >
                  <span className="a11y-prompt-label">{t(p.group)}</span>
                  <span className="a11y-prompt-ask">{smarten(t(p.prompt), getLang())}</span>
                  {/* The press, said in words; the button's name is already
                      the label and the question, so this is not read twice. */}
                  <span className="a11y-prompt-go" aria-hidden="true">{t("Ask this")}</span>
                </button>
                {/* The criterion the question checks, at the foot of the
                    card. A question that checks none shows nothing. */}
                {crit && (
                  <button
                    type="button"
                    className="a11y-prompt-wcag"
                    disabled={busy || loading}
                    aria-label={tf("WCAG {id} {name}: what it asks", { id: crit, name: CRITERIA[crit].name })}
                    onClick={() => explainCriterion(crit)}
                  >
                    {crit}
                  </button>
                )}
              </div>
            );
          })}
          {/* Report a barrier, promoted into the opening (user's
              instruction, 20 Nov 2026: "promote it so it appears in chat on
              load"). Set as the other cards, with its own words for the
              press, on the marker yellow (a11y-prompt-barrier; user's
              instruction, 20 Nov 2026, "make the barrier card stand out
              more"), and the fourth card in their row (user's instruction,
              20 Nov 2026, "add yellow button 4th in a row"). It stays when
              the questions are shuffled. */}
          {onReportBarrier && (
            <div className="a11y-prompt a11y-prompt-barrier">
              <button type="button" className="a11y-prompt-q" disabled={busy || loading} onClick={onReportBarrier}>
                <span className="a11y-prompt-label">{t("Report a barrier")}</span>
                <span className="a11y-prompt-ask">{smarten(t("Did something on a website stop you or slow you down?"), getLang())}</span>
                <span className="a11y-prompt-go" aria-hidden="true">{t("Start a report")}</span>
              </button>
            </div>
          )}
          </div>
          <p className="a11y-prompt-more">
            <Button variant="ghost" onClick={() => setPicks((last) => pickOpeningPrompts(Math.random, last))}>
              {t("Other questions")}
            </Button>
          </p>
        </section>
      )}
      {!barrier && turns.length > 0 && (
        // role="list" said out loud: WebKit drops the list role from a list
        // drawn without markers, and the label with it.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ol className="a11y-chat-thread" role="list" aria-label={t("Conversation")}>
          {turns.map((turn, i) => {
            // One assistant message, however many parts it lands in. A scan
            // line, the blocks it opens and the reply about them follow one
            // another as one speaker's turn: the label is said once, on the
            // first part, and the parts after it sit a line apart rather
            // than two (user's instruction, 20 Nov 2026, "file a report in
            // chat like an assistant would do"; it read as four speakers
            // cutting in). The label stays for screen readers on every part,
            // since each is its own list item.
            const prev = i > 0 ? turns[i - 1] : null;
            const cont = !!prev && prev.who !== "you" && prev.who !== "notice" && turn.who !== "you" && turn.who !== "notice";
            const contClass = cont ? " a11y-chat-cont" : "";
            const whoClass = cont ? "a11y-chat-who a11y-sr-only" : "a11y-chat-who";
            if (turn.who === "scan") {
              const running = turn.state === "running";
              const steps = running ? milestones : turn.steps;
              const current = running ? steps[steps.length - 1] : null;
              const fresh = turn.resultKey && turn.resultKey === currentKey && report;
              // One sentence per state, translated whole; the address is
              // set into it rather than stitched onto a fragment.
              const [before, after] = t(
                running ? "Checking {url}." : turn.state === "done" ? "Checked {url}." : "Couldn't check {url}."
              ).split("{url}");
              return (
                <li key={turn.id} className={`a11y-chat-turn a11y-chat-tool a11y-chat-scan-${turn.state}${contClass}`}>
                  <p className={whoClass}>{t("Assistant")}</p>
                  <div className="a11y-chat-text">
                    {/* No seconds beside the address: the step list below
                        says where the scan is, and the number was one
                        more thing to read (user's instruction, 16 Oct 2026). */}
                    <p>{urlInSentence(before, turn.url, after)}</p>
                  </div>
                  {steps.length > 0 && (
                    <StepFold folded={turn.state === "done"}>
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
                              {result && <span className="a11y-chat-step-result"> – {result}</span>}
                            </li>
                          );
                        })}
                    </ol>
                    </StepFold>
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
                  <li key={turn.id} className={`a11y-chat-turn a11y-chat-stop${contClass}`}>
                    {body}
                  </li>
                ) : null;
              }
              // No fold line over a block (user's instructions: 21 Nov 2026,
              // "delete these" on "Findings · Hide details"; 22 Nov 2026,
              // "delete all repetition" on "WCAG 2.2 · Hide details" over
              // "Ready for WCAG 2.2?"): every section carries its own
              // heading, so the line only said it again. A block stands
              // open; one from an earlier scan is a single line naming it.
              return (
                <li key={turn.id} id={`a11y-chat-block-${turn.id}`} className={`a11y-chat-turn a11y-chat-block${contClass}`}>
                  <div className="a11y-chat-blockbody">
                    {fresh ? (
                      <>
                        {turn.section === "findings" && renderSection("protable")}
                        {body}
                      </>
                    ) : (
                      <p className="a11y-chat-stale">
                        {sectionLabel(turn.section)} – {t("From an earlier scan. Run it again to see it.")}
                      </p>
                    )}
                  </div>
                </li>
              );
            }
            if (turn.who === "notice") {
              return (
                <li key={turn.id} className="a11y-chat-turn">
                  <BlockedNotice message={turn.message} onSignIn={onSignInForm} />
                </li>
              );
            }
            return (
              <li
                key={turn.id}
                className={`a11y-chat-turn a11y-chat-${turn.who}${contClass}`}
                aria-busy={turn.who === "checker" && turn.streaming ? true : undefined}
              >
                <p className={whoClass}>{turn.who === "you" ? t("You") : t("Assistant")}</p>
                <div className="a11y-chat-text">
                  {turn.who === "checker" ? (
                    <>
                      {turn.text ? renderReply(turn.text, turn.marks) : turn.searching === undefined && waiting(t("Thinking…"))}
                      {/* A search in progress, under whatever has been said so
                          far: the wait has a name, and the query once it is known. */}
                      {turn.streaming && turn.searching !== undefined && waiting(searchingLine(turn.searching))}
                      {/* "Did you mean accessibility.nl?": the address is a
                          button, and pressing it is the yes (user's
                          instruction, 18 Nov 2026, "i would like to click
                          website so it is researching it"). Only under the
                          last reply, and only once it has finished. */}
                      {!turn.streaming && turn.id === lastReplyId && confirmAddress && (
                        <p className="a11y-chat-confirm">
                          <Button
                            variant="ghost"
                            disabled={busy || loading}
                            onClick={() => void ask(tf("Yes, check {url}", { url: confirmAddress }))}
                          >
                            {tf("Check {url}", { url: confirmAddress })}
                          </Button>
                        </p>
                      )}
                      {turn.sources && turn.sources.length > 0 && (
                        <p className="a11y-chat-sources">
                          {t("Sources")}:{" "}
                          {turn.sources.map((s, i) => (
                            <span key={s.url}>
                              {i > 0 && ", "}
                              <a href={s.url} target="_blank" rel="noopener noreferrer">
                                {s.title}
                              </a>
                            </span>
                          ))}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{capsWrap(smarten(turn.text, getLang()))}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!barrier && (
      <div className="a11y-chat-dock" ref={dockRef}>
        {/* An assistant's box: the prompt is a visible label at the top
            inside it, and the actions sit under the text, inside the same
            edge. It was the placeholder with a screen-reader-only label,
            and a placeholder goes the moment someone types, the one moment
            they need to see what the box is for (WCAG 3.3.2), so the
            placeholder is gone rather than saying the label twice. Enter
            sends; Shift+Enter breaks a line; the box grows with the text. */}
        <form className="a11y-chat-composer" onSubmit={send} aria-label={t("New scan")}>
          <div className="a11y-chat-box">
            <label className="a11y-chat-label" htmlFor="a11y-chat-input">
              {prompt}
            </label>
            <textarea
              id="a11y-chat-input"
              rows={2}
              value={draft}
              autoComplete="off"
              enterKeyHint="send"
              maxLength={4000}
              onChange={(e) => {
                setDraft(e.target.value);
                // Measured from 0px, not auto: auto falls back to rows={2},
                // so a one-line message stood two lines tall on a phone,
                // where the field starts at one. The CSS min-height still
                // holds the desktop's two lines.
                e.target.style.height = "0px";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              aria-describedby={suggestion ? "a11y-chat-tabhint" : undefined}
              onKeyDown={(e) => {
                // Tab takes the suggestion; with none
                // showing, or once taken, Tab moves on as it always does.
                if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && suggestion) {
                  e.preventDefault();
                  setDraft(suggestion);
                  const el = e.currentTarget;
                  requestAnimationFrame(() => {
                    el.style.height = "0px";
                    el.style.height = el.scrollHeight + "px";
                    el.setSelectionRange(el.value.length, el.value.length);
                  });
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="a11y-chat-box-row">
              <span className="a11y-chat-box-start">
                {backTo && (
                  <Button variant="ghost" onClick={goBack}>
                    <Icon name="arrow--left" />{" "}
                    {t("Back")}
                  </Button>
                )}
                <VoiceControl />
                {/* In the box (user's instruction, 20 Nov 2026), and only
                    while a website is being scanned: the message names an
                    address, or a website's report is open. It opens the
                    form, so the login goes to the scanner and never into
                    the chat or its model. */}
                {(addressIn(draft) || (report && report.meta.documentKind !== "pdf")) && (
                  <Button variant="ghost" onClick={onSignInForm}>
                    {t("Scan a page behind a login")}
                  </Button>
                )}
              </span>
              {/* The line Tab would fill in, in the row of buttons and cut to
                  one line (user's report, 23 Nov 2026, "the typed text is
                  flickering"). It sat on its own line under the text, and
                  came and went as letters matched an opening question or
                  stopped matching; the box is pinned to the window's foot
                  and grows upwards, so the words being typed jumped 51px up
                  and down with it. Here it takes the row's empty middle, so
                  the box keeps its height. Screen readers still get the
                  whole question through aria-describedby. */}
              {suggestion && (
                <p className="a11y-chat-tabhint" id="a11y-chat-tabhint">
                  <span className="a11y-sr-only">{t("Press Tab to use this suggestion:")} </span>
                  <kbd aria-hidden="true">Tab</kbd>
                  <span className="a11y-chat-tabhint-text">{smarten(suggestion, getLang())}</span>
                </p>
              )}
              <Button type="submit" variant="primary" disabled={busy || loading || !draft.trim()}>
                {/* On a phone the word is clipped and the arrow drawn: the
                    button keeps "Send" as its name. */}
                <span className="a11y-chat-send-word">{t("Send")}</span>
                <Icon name="arrow--up" size={22} className="a11y-chat-send-icon" />
              </Button>
            </div>
          </div>
          {/* The report's sections, under the box in the sticky dock, so
              they stay on screen while the thread scrolls (user's
              instruction, 20 Nov 2026, "put them below chat so it's not on
              scroll"). Each is type="button", so none submits the form. */}
          {offered.length > 0 && (
            <div className="a11y-chat-suggest" role="group" aria-label={t("Show from the report")}>
              {offered.map((s) => (
                <button key={s.key} type="button" className="a11y-chat-chip" onClick={() => showSection(s.key, { takeFocus: true })}>
                  {s.label()}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
      )}

      {/* The one place the assistant is announced from: the finished reply,
          once, or "Thinking…" while it works. Mounted from the start, so
          the first change is heard. */}
      <p className="a11y-sr-only" role="status">
        {announcement}
      </p>
    </div>
    </div>
  );
}

/** The step lines of a scan, once it is over, behind a Details toggle,
 *  so the thread reads as the
 *  conversation and the working is one click away. A running scan shows
 *  its steps; a failed one too, since its last line says where it stopped. */
function StepFold({ folded, children }: { folded: boolean; children: ReactNode }) {
  if (!folded) return <>{children}</>;
  return (
    <details className="a11y-chat-stepfold">
      <summary>
        {t("Details")}
        <span className="a11y-chat-fold" aria-hidden="true">
          <span className="a11y-chat-fold-closed"><Icon name="caret--right" /></span>
          <span className="a11y-chat-fold-open"><Icon name="caret--down" /></span>
        </span>
      </summary>
      {children}
    </details>
  );
}
