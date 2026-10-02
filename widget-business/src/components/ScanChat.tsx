import { useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from "react";
import { t } from "../lib/strings";
import { Input } from "./Input";
import { Button } from "./Button";
import { LanguageSelect } from "./LanguageSelect";
import { BlockedNotice } from "./BlockedNotice";
import type { Lang } from "../lib/i18n";
import { WCAG_LINK } from "../lib/wcagPlain";
import type { AccessibilityReport, SiteAudit } from "../api/scanClient";
import {
  addressIn,
  ChatUnavailableError,
  sendChatTurn,
  textOf,
  type ChatBlock,
  type ChatMessage,
} from "../api/chatClient";
import { digestAudit, digestReport } from "../lib/reportDigest";
import { NARRATION_STEPS, narrationIndex, narrationLabel } from "../lib/scanNarration";
import { SHOWABLE, sectionForCommand, sectionLabel, type SectionKey } from "../lib/sections";

/**
 * The whole checker, as one conversation — modelled on a Claude Code
 * transcript.
 *
 * The person says what to check. The assistant starts the scan, which runs
 * as a tool block: a header, then one line per step as the pipeline
 * crosses it, each filled in with what the report found there once it
 * lands. Every part of the report — score, findings, legal checklist,
 * statement, VPAT, simulator, settings — is a block in the thread, shown
 * after a scan, when asked for, by its /command, or by its suggestion
 * button. There is no separate report page in this reading; the form keeps
 * that one, one button away, and stays the way to scan behind a login.
 *
 * Accessibility, decided rather than defaulted:
 *  - The thread is a plain ordered list, not a live region; streamed text
 *    in one is re-announced on every chunk. A finished reply is announced
 *    once, through the status region at the end.
 *  - Speakers and tool lines are named in text. The ⏺ and ⎿ marks are
 *    decoration and hidden from assistive technology.
 *  - Each report block is a native <details>, open by default.
 *  - The composer is pinned to the bottom of the screen, and anything that
 *    takes focus underneath it is scrolled clear (WCAG 2.4.11).
 */

export type ScanOutcome =
  | { kind: "report"; report: AccessibilityReport }
  | { kind: "audit"; audit: SiteAudit }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

type Turn =
  | { id: number; who: "you" | "checker"; text: string; streaming?: boolean }
  | { id: number; who: "scan"; url: string; state: "running" | "done" | "failed"; steps: string[]; seconds?: number; resultKey?: string }
  | { id: number; who: "block"; section: SectionKey; resultKey: string }
  | { id: number; who: "notice"; message: string };

let nextId = 1;

/** Paragraphs, hyphen lists and **bold** — the only formatting the system
 *  prompt allows. Built as elements, never as HTML: the text comes from a
 *  model, and none of it should reach a parser. */
function renderReply(text: string): ReactNode {
  const bold = (line: string) =>
    line.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((para, i) => {
      const lines = para.split("\n");
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return (
          <ul key={i}>
            {lines.map((l, j) => (
              <li key={j}>{bold(l.replace(/^\s*[-•]\s+/, ""))}</li>
            ))}
          </ul>
        );
      }
      return <p key={i}>{bold(para)}</p>;
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

/** What the report found at one step of the scan, for its tool line.
 *  Counts of findings in that area — read from the report, never guessed. */
function stepResult(step: string, report: AccessibilityReport): string | null {
  const count = (test: (ruleId: string) => boolean) =>
    report.findings.filter((f) => f.ruleId && test(f.ruleId)).length;
  const found = (n: number) => (n ? `${n} ${t("found")}` : t("Nothing found"));
  switch (step) {
    case "load":
      return report.meta.renderTimeMs ? `${(report.meta.renderTimeMs / 1000).toFixed(1)}s` : null;
    case "rules":
      return found(report.findings.filter((f) => f.source === "automated" && f.category === "accessibility").length);
    case "screen-reader":
      return report.screenReaderScript ? found(report.screenReaderScript.lines.filter((l) => l.issue).length) : null;
    case "keyboard":
      return found(count((r) => r.startsWith("keyboard-") || r.startsWith("dialog-")));
    case "text-resize":
      return found(count((r) => r.startsWith("text-")));
    case "phone":
      return found(count((r) => r.startsWith("mobile-")));
    case "ai-review":
      return report.meta.aiReviewStatus === "completed"
        ? found(report.findings.filter((f) => f.source === "ai-review").length)
        : null;
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
  const focusInput = () => rootRef.current?.querySelector<HTMLInputElement>("#a11y-chat-input")?.focus();

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
  function showSection(key: SectionKey, resultKey: string | null = currentKeyRef.current, force = false): boolean {
    if (!resultKey || !(force || availableRef.current.includes(key))) return false;
    const existing = turnsRef.current.find((x) => x.who === "block" && x.section === key && x.resultKey === resultKey);
    if (existing) {
      const summary = rootRef.current?.querySelector<HTMLElement>(`#a11y-chat-block-${existing.id} > summary`);
      summary?.scrollIntoView({ block: "start" });
      summary?.focus();
      setAnnouncement(`${sectionLabel(key)}: ${t("shown above.")}`);
      return true;
    }
    add({ id: nextId++, who: "block", section: key, resultKey });
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
    // Forced: these exist for every report and every audit, and the render
    // that would list them as available may not have happened yet.
    if (outcome.kind === "report") showSection("findings", resultKeyOf(outcome.report), true);
    if (outcome.kind === "audit") showSection("audit", resultKeyOf(outcome.audit), true);
  }

  /** One assistant turn, and the tools it calls. A scan gets a second turn
   *  so the assistant can say what came back; a shown section does not —
   *  the block speaks for itself, and the next question picks it up. */
  async function assistantTurn(messages: ChatMessage[]) {
    const turnId = nextId++;
    add({ id: turnId, who: "checker", text: "", streaming: true });
    setAnnouncement(t("Thinking…"));

    const result = await sendChatTurn(apiBase, messages, (delta) =>
      setAll(
        turnsRef.current.map((x) => (x.id === turnId && x.who === "checker" ? { ...x, text: x.text + delta } : x))
      )
    );

    history.current = [...messages, { role: "assistant", content: result.content }];
    const text = textOf(result.content);
    if (text.trim()) {
      patch(turnId, { text, streaming: false });
      setAnnouncement(text);
    } else {
      // A turn that is only a tool call leaves no empty "Checker" behind.
      setAll(turnsRef.current.filter((x) => x.id !== turnId));
    }

    if (result.show.length) {
      const results: ChatBlock[] = result.show.map((req) => {
        const key = req.section as SectionKey;
        const shown = SHOWABLE.some((s) => s.key === key) && showSection(key);
        return {
          type: "tool_result",
          tool_use_id: req.toolUseId,
          content: shown ? "Shown in the conversation." : "Not available for this scan.",
          ...(shown ? {} : { is_error: true }),
        };
      });
      history.current = [...history.current, { role: "user", content: results }];
    }

    if (result.scan) {
      const outcome = await runScan(result.scan.url, result.scan.scope, result.scan.aiReview);
      const failed = outcome.kind === "blocked" || outcome.kind === "error";
      const toolResult: ChatMessage = {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: result.scan.toolUseId,
            content: failed
              ? `The scan did not complete: ${outcomeLine(outcome)}`
              : JSON.stringify(outcome.kind === "report" ? digestReport(outcome.report) : digestAudit(outcome.audit)),
            ...(failed ? { is_error: true } : {}),
          },
        ],
      };
      // Committed before the next request, success or not: a tool call
      // without its result would make every later turn invalid.
      history.current = [...history.current, toolResult];
      await assistantTurn(history.current);
      if (!failed) showResult(outcome);
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

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || loading) return;
    setDraft("");
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
      // A result the assistant has not seen — one from the form — rides
      // along with this message, once.
      const blocks: ChatBlock[] = [];
      const currentKey = currentKeyRef.current;
      if (currentKey && sharedScan.current !== currentKey) {
        blocks.push({
          type: "text",
          text: `Report of a scan the person ran from the form:\n${JSON.stringify(
            report ? digestReport(report) : digestAudit(audit!)
          )}`,
        });
        sharedScan.current = currentKey;
      }
      const userMessage: ChatMessage = {
        role: "user",
        content: blocks.length ? [...blocks, { type: "text", text }] : text,
      };
      const before = history.current;
      try {
        await assistantTurn([...before, userMessage]);
      } catch (err) {
        if (err instanceof ChatUnavailableError) {
          assistantDown.current = true;
          setAll(turnsRef.current.filter((x) => !(x.who === "checker" && x.streaming)));
          await fallbackTurn(text);
          return;
        }
        // The failed turn leaves the history as it was before it, so
        // sending again does not stack two copies of the same question.
        if (history.current === before && blocks.length) sharedScan.current = null;
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
      focusInput();
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

  return (
    <div className="a11y-chat" ref={rootRef} onFocus={keepFocusClear}>
      <div className="a11y-newscan-head">
        <h2 className="a11y-section-title a11y-newscan-title" id="a11y-newscan-title">
          {t("New scan")}
        </h2>
        <LanguageSelect id="a11y-lang-form" value={language} onChange={onLanguageChange} />
      </div>
      <p className="a11y-newscan-sub">
        We audit every page we can reach against the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>{" "}
        2.1 and explain what to fix, in the order worth fixing it.
      </p>

      {turns.length > 0 && (
        <ol className="a11y-chat-thread" aria-label={t("Conversation")}>
          {turns.map((turn) => {
            if (turn.who === "scan") {
              const running = turn.state === "running";
              const steps = running ? milestones : turn.steps;
              const current = running ? steps[steps.length - 1] : null;
              const fresh = turn.resultKey && turn.resultKey === currentKey && report;
              return (
                <li key={turn.id} className={`a11y-chat-turn a11y-chat-tool a11y-chat-scan-${turn.state}`}>
                  <p className="a11y-chat-toolhead">
                    <span className="a11y-chat-mark" aria-hidden="true">⏺</span>{" "}
                    {running ? t("Checking") : turn.state === "done" ? t("Checked") : t("Could not check")}{" "}
                    <span className="a11y-chat-url">{turn.url}</span>
                    {running && !reducedMotion && (
                      <span className="a11y-chat-elapsed" aria-hidden="true"> ({elapsed}s)</span>
                    )}
                    {!running && turn.seconds ? <span className="a11y-chat-elapsed"> ({turn.seconds}s)</span> : null}
                  </p>
                  {steps.length > 0 && (
                    <ol className="a11y-chat-steps">
                      {NARRATION_STEPS.filter((s) => steps.includes(s.id))
                        .sort((a, b) => narrationIndex(a.id) - narrationIndex(b.id))
                        .map((s) => {
                          const result = fresh ? stepResult(s.id, fresh) : null;
                          return (
                            <li
                              key={s.id}
                              className={`a11y-chat-step${s.id === current ? " a11y-chat-step-now" : ""}`}
                              aria-current={s.id === current ? "step" : undefined}
                            >
                              <span className="a11y-chat-mark" aria-hidden="true">⎿</span>{" "}
                              {narrationLabel(s.id)}
                              {result && <span className="a11y-chat-step-result"> · {result}</span>}
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
                    <summary className="a11y-chat-toolhead">
                      <span className="a11y-chat-mark" aria-hidden="true">⏺</span> {sectionLabel(turn.section)}
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
                <p className="a11y-chat-who">
                  {turn.who === "checker" && (
                    <>
                      <span className="a11y-chat-mark" aria-hidden="true">⏺</span>{" "}
                    </>
                  )}
                  {turn.who === "you" ? t("You") : t("Checker")}
                </p>
                <div className="a11y-chat-text">
                  {turn.who === "checker" ? (
                    turn.text ? (
                      renderReply(turn.text)
                    ) : (
                      <p className="a11y-chat-thinking">{t("Thinking…")}</p>
                    )
                  ) : (
                    <p>{turn.text}</p>
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
        <form className="a11y-chat-composer" onSubmit={send} aria-labelledby="a11y-newscan-title">
          <Input
            id="a11y-chat-input"
            size="display"
            label={currentKey ? t("Ask about the report, or name another site") : t("Which site should I check?")}
            placeholder="example.com"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            helperText={
              currentKey
                ? t("Type / and a section name to show it, for example /checklist.")
                : t("An address is enough. Say if you want the whole site or the AI review.")
            }
            inputProps={{ autoComplete: "off", enterKeyHint: "send" }}
            action={
              <Button type="submit" variant="primary" disabled={busy || loading || !draft.trim()}>
                {t("Send")}
              </Button>
            }
          />
        </form>
        <p className="a11y-chat-alt">
          <Button variant="ghost" onClick={onUseForm}>
            {t("Use the form instead")}
          </Button>{" "}
          <span className="a11y-chat-alt-note">{t("Needed for pages behind a login.")}</span>
        </p>
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
