import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { t } from "../lib/strings";
import { Input } from "./Input";
import { Button } from "./Button";
import { LanguageSelect } from "./LanguageSelect";
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

/**
 * The checker's front door, as a conversation.
 *
 * The person says what to check; the assistant starts the scan; the scan
 * runs inside the thread with its narration; the report lands below and
 * the conversation stays open for questions about it. The form is one
 * button away and stays the way to scan behind a login, because a password
 * typed into a chat would travel through the model, and the form's own
 * sign-in keeps it out.
 *
 * Accessibility, decided rather than defaulted:
 *  - The thread is a plain ordered list, not a live region. Streamed text
 *    in a live region is re-announced on every chunk. The finished reply
 *    is announced once, through the status region below the composer.
 *  - Every turn carries its speaker as visible text. Alignment and colour
 *    say it too, but never alone.
 *  - Focus returns to the message field after every send, so a keyboard
 *    user types the next question without hunting for the box.
 */

export type ScanOutcome =
  | { kind: "report"; report: AccessibilityReport }
  | { kind: "audit"; audit: SiteAudit }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

type Turn =
  | { id: number; who: "you" | "checker"; text: string; streaming?: boolean }
  | { id: number; who: "scan"; url: string; state: "running" | "done" | "failed" };

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
  // Whole sentences only: a line stitched from translated fragments
  // ("issues", "average") reads wrong in every language but English.
  switch (outcome.kind) {
    case "report":
      return `${t("Scan finished.")} ${t("Score")} ${outcome.report.score}/100. ${t("The report is below.")}`;
    case "audit":
      return `${t("Scan finished.")} ${t("The report is below.")}`;
    case "blocked":
    case "error":
      return outcome.message;
  }
}

export function ScanChat({
  apiBase,
  loading,
  progress,
  report,
  audit,
  onScan,
  onUseForm,
  language,
  onLanguageChange,
}: {
  apiBase: string;
  loading: boolean;
  /** The scan's narration, shown inside the running scan turn. */
  progress: ReactNode;
  report: AccessibilityReport | null;
  audit: SiteAudit | null;
  onScan: (url: string, scope: "page" | "site", aiReview: boolean) => Promise<ScanOutcome>;
  onUseForm: () => void;
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
  // Which report the assistant has already been given, so a scan started
  // from the form reaches the conversation once and only once.
  const sharedScan = useRef<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const hasResult = Boolean(report || audit);
  const focusInput = () =>
    composerRef.current?.querySelector<HTMLInputElement>("#a11y-chat-input")?.focus();

  const add = (turn: Turn) => setTurns((prev) => [...prev, turn]);
  const patch = (id: number, change: Partial<Turn>) =>
    setTurns((prev) => prev.map((x) => (x.id === id ? ({ ...x, ...change } as Turn) : x)));

  async function runScan(url: string, scope: "page" | "site", aiReview: boolean) {
    const turnId = nextId++;
    add({ id: turnId, who: "scan", url, state: "running" });
    const outcome = await onScan(url, scope, aiReview);
    patch(turnId, { state: outcome.kind === "report" || outcome.kind === "audit" ? "done" : "failed" });
    if (outcome.kind === "report") sharedScan.current = outcome.report.scannedAt;
    if (outcome.kind === "audit") sharedScan.current = outcome.audit.scannedAt;
    return outcome;
  }

  /** One assistant turn, and the scan it asks for, if any. Recurses once
   *  after a scan so the assistant can say what came back. */
  async function assistantTurn(messages: ChatMessage[]) {
    const turnId = nextId++;
    add({ id: turnId, who: "checker", text: "", streaming: true });
    setAnnouncement(t("Thinking…"));

    const result = await sendChatTurn(apiBase, messages, (delta) =>
      setTurns((prev) =>
        prev.map((x) => (x.id === turnId && x.who === "checker" ? { ...x, text: x.text + delta } : x))
      )
    );

    history.current = [...messages, { role: "assistant", content: result.content }];
    const text = textOf(result.content);
    patch(turnId, { text, streaming: false });
    setAnnouncement(text);

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
    }
  }

  /** No assistant on this server: scan the address if there is one, and
   *  say plainly that nothing more is on offer. */
  async function fallbackTurn(text: string) {
    const url = addressIn(text);
    if (!url) {
      add({ id: nextId++, who: "checker", text: t("The assistant is not available on this server. Paste an address and the scan still runs.") });
      setAnnouncement(t("The assistant is not available on this server. Paste an address and the scan still runs."));
      return;
    }
    const outcome = await runScan(url, "page", false);
    const line = outcomeLine(outcome);
    add({ id: nextId++, who: "checker", text: line });
    setAnnouncement(line);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || loading) return;
    setDraft("");
    setBusy(true);
    add({ id: nextId++, who: "you", text });
    focusInput();

    try {
      if (assistantDown.current) {
        await fallbackTurn(text);
        return;
      }
      // A report the assistant has not seen — one run from the form —
      // rides along with this message, once.
      const current = report?.scannedAt ?? audit?.scannedAt ?? null;
      const blocks: ChatBlock[] = [];
      if (current && sharedScan.current !== current) {
        blocks.push({
          type: "text",
          text: `Report of a scan the person ran from the form:\n${JSON.stringify(
            report ? digestReport(report) : digestAudit(audit!)
          )}`,
        });
        sharedScan.current = current;
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
          setTurns((prev) => prev.filter((x) => !(x.who === "checker" && x.streaming)));
          await fallbackTurn(text);
          return;
        }
        // The failed turn leaves the history as it was before it, so
        // sending again does not stack two copies of the same question. A
        // report that rode along with it was not delivered either.
        if (history.current === before && blocks.length) sharedScan.current = null;
        setTurns((prev) =>
          prev.map((x) =>
            x.who === "checker" && x.streaming
              ? { ...x, text: err instanceof Error ? err.message : t("The assistant could not answer that."), streaming: false }
              : x
          )
        );
        setAnnouncement(err instanceof Error ? err.message : t("The assistant could not answer that."));
      }
    } finally {
      setBusy(false);
      focusInput();
    }
  }

  return (
    <div className="a11y-chat">
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
          {turns.map((turn) =>
            turn.who === "scan" ? (
              <li key={turn.id} className={`a11y-chat-turn a11y-chat-scan a11y-chat-scan-${turn.state}`}>
                <p className="a11y-chat-who">
                  {turn.state === "running" ? t("Checking") : turn.state === "done" ? t("Checked") : t("Could not check")}{" "}
                  <span className="a11y-chat-url">{turn.url}</span>
                </p>
                {turn.state === "running" && progress}
              </li>
            ) : (
              <li
                key={turn.id}
                className={`a11y-chat-turn a11y-chat-${turn.who}`}
                aria-busy={turn.who === "checker" && turn.streaming ? true : undefined}
              >
                <p className="a11y-chat-who">{turn.who === "you" ? t("You") : t("Checker")}</p>
                <div className="a11y-chat-text">
                  {turn.who === "checker"
                    ? turn.text
                      ? renderReply(turn.text)
                      : <p className="a11y-chat-thinking">{t("Thinking…")}</p>
                    : <p>{turn.text}</p>}
                </div>
              </li>
            )
          )}
        </ol>
      )}

      <form className="a11y-chat-composer" onSubmit={send} aria-labelledby="a11y-newscan-title">
        <div ref={composerRef}>
          <Input
            id="a11y-chat-input"
            size="display"
            label={hasResult ? t("Ask about the report, or name another site") : t("Which site should I check?")}
            placeholder="example.com"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            helperText={t("An address is enough. Say if you want the whole site or the AI review.")}
            inputProps={{ autoComplete: "off", enterKeyHint: "send" }}
            action={
              <Button type="submit" variant="primary" disabled={busy || loading || !draft.trim()}>
                {t("Send")}
              </Button>
            }
          />
        </div>
        <p className="a11y-chat-alt">
          <Button variant="ghost" onClick={onUseForm}>
            {t("Use the form instead")}
          </Button>{" "}
          <span className="a11y-chat-alt-note">{t("Needed for pages behind a login.")}</span>
        </p>
      </form>

      {/* The one place the assistant is announced from: the finished reply,
          once, or "Thinking…" while it works. Mounted from the start, so
          the first change is heard. */}
      <p className="a11y-sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}
