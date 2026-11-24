import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createLinePlayer, type LinePlayer, type PlayerState, type SpeechEngine } from "../lib/linePlayer";
import { t, tf } from "../lib/strings";
import { StatusChip } from "./SectionHeader";
import { useReportView } from "./ReportViewContext";
import type { ScreenReaderScript } from "../api/scanClient";
import { Icon } from "./Icon";

// Lets an owner hear their own page the way a screen-reader user does. Reading
// a list of violations is abstract; hearing "button, unlabelled" where your
// page shows a clear "Buy now" is not.
//
// Playback uses the browser's built-in speech synthesis, so nothing is sent
// anywhere and no audio is generated server-side. Where speech isn't available
// (some browsers expose no voices at all) the transcript still reads fine on
// its own, and we say so rather than showing a dead button.

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Speech through the browser's engine, one utterance per line. A little
// quicker than default: real screen-reader users run far faster than this,
// but much beyond 1.2 stops being intelligible to someone hearing it for
// the first time.
const browserEngine: SpeechEngine<SpeechSynthesisUtterance> = {
  make: (text) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.15;
    return u;
  },
  speak: (u) => window.speechSynthesis.speak(u),
  cancel: () => window.speechSynthesis.cancel(),
};

// Keys that type: the transcript's arrow keys leave them alone.
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(el.type);
}

export function ScreenReaderPreview({ script }: { script: ScreenReaderScript }) {
  const [player, setPlayer] = useState<PlayerState>({ status: "idle", line: null });
  const playing = player.status === "playing";
  const active = player.status !== "idle";
  const current = player.line;
  const [expanded, setExpanded] = useState(false);
  // Whether the accordion is open. Closed by default: this is the longest
  // section in the report and the one you consult rather than read.
  const [open, setOpen] = useState(false);
  // In the conversation the panel is open and the heading is a plain
  // heading: a block there is the whole answer to "show me", so a toggle to
  // press before the transcript shows would only ask again.
  const { inChat } = useReportView();
  const panelOpen = inChat || open;
  const [onlyIssues, setOnlyIssues] = useState(false);
  const panelId = useId();
  const supported = useMemo(speechSupported, []);
  const sectionRef = useRef<HTMLElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  // Whether keyboard focus was last on Previous, Next or Stop, which leave
  // the screen when reading ends. Focus then goes to Play, not the page top.
  const transportFocusRef = useRef(false);
  // Where "Skip the transcript" sends focus. The show-all/show-fewer
  // toggle just past the table, rather than every per-line play button in
  // between, which on a normal page numbers over a hundred.
  const showAllRef = useRef<HTMLButtonElement>(null);

  const lines = script.lines;
  const issueCount = useMemo(() => lines.filter((l) => l.issue).length, [lines]);

  // The player lives as long as the component. Its lines follow the script;
  // a new script stops the old one mid-sentence rather than reading on.
  const texts = useMemo(() => lines.map((l) => l.text), [lines]);
  const playerRef = useRef<LinePlayer | null>(null);
  if (supported && !playerRef.current) {
    playerRef.current = createLinePlayer(browserEngine, texts, setPlayer);
  }
  useEffect(() => {
    playerRef.current?.setLines(texts);
  }, [texts]);

  // Always stop speaking when the component goes away — audio outliving the
  // thing that started it is jarring and inescapable.
  useEffect(() => () => playerRef.current?.stop(), []);

  const speakFrom = useCallback((startIndex: number) => {
    playerRef.current?.play(startIndex);
  }, []);

  // Escape stops reading from anywhere on the page, the way a real screen
  // reader is silenced with one key, and only while there is something to
  // stop. A control that already used the key (a menu closing) keeps it.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      playerRef.current?.stop();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  // When reading ends, by itself or by Stop, the transport buttons leave.
  // If focus was on one of them it would drop to the page; it goes to Play.
  const wasActive = useRef(false);
  useLayoutEffect(() => {
    if (wasActive.current && !active && transportFocusRef.current) {
      transportFocusRef.current = false;
      const root = sectionRef.current?.getRootNode() as Document | ShadowRoot | undefined;
      const focused = root?.activeElement;
      if (!focused || !sectionRef.current?.contains(focused)) {
        playRef.current?.focus({ preventScroll: true });
      }
    }
    wasActive.current = active;
  }, [active]);

  // Inside the preview, while reading or paused, the left and right arrows
  // go back and on one line. Not character keys (WCAG 2.1.4), and only with
  // focus in the preview, so they never take the arrows from the page.
  const onSectionKeyDown = (e: React.KeyboardEvent) => {
    if (!active || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (isTypingTarget(e.target)) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      playerRef.current?.previous();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      playerRef.current?.next();
    }
  };

  if (lines.length === 0) return null;

  // Keep each line's original position. Playback indexes into the full script,
  // so filtering the view must not renumber it — otherwise "play from here"
  // starts somewhere else entirely.
  const entries = lines.map((line, index) => ({ line, index }));
  const filtered = onlyIssues ? entries.filter((e) => e.line.issue) : entries;
  const visible = expanded ? filtered : filtered.slice(0, 12);

  return (
    <section
      ref={sectionRef}
      className="a11y-section a11y-sr"
      aria-labelledby="a11y-sr-heading"
      onKeyDown={onSectionKeyDown}
    >
      {/* An accordion. This section is the longest thing in the report by
          a wide margin — 120 rows on a normal page — and it is supplementary:
          you open it to hear a problem, not to read it end to end. Collapsed
          by default it costs one row instead of a screenful.

          The heading holds the button rather than sitting inside it, so the
          heading stays a heading in the accessibility tree and screen-reader
          users can still jump between sections by heading. */}
      {/* The accordion row and the lead are the section head, wrapped so the
          two-column grid treats them as one item. Grid rows are shared between
          columns, so loose head siblings get pushed below a tall content item
          — 2,200px, in the section where that was measured. */}
      <div className="a11y-section-head">
      <div className="a11y-accordion-row">
        {inChat ? (
          <h2 className="a11y-section-title" id="a11y-sr-heading">
            {t("Screen reader simulation")}{" "}
            {lines.length === 1
              ? t("(1 announcement)")
              : tf("({count} announcements)", { count: lines.length })}
          </h2>
        ) : (
        <h2 className="a11y-section-title a11y-accordion-title" id="a11y-sr-heading" data-nav-label={t("Screen reader simulation")}>
          <button
            type="button"
            className="a11y-accordion-head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span>
              {t("Screen reader simulation")}{" "}
              <span className="a11y-section-count">
                {lines.length === 1
                  ? t("(1 announcement)")
                  : tf("({count} announcements)", { count: lines.length })}
              </span>
            </span>
            {/* The count of problems stays visible while collapsed. A closed
                section with nothing to show for it gives no reason to open it. */}
            {issueCount > 0 && (
              <StatusChip>
                {issueCount === 1
                  ? t("1 says nothing useful")
                  : tf("{count} say nothing useful", { count: issueCount })}
              </StatusChip>
            )}
            <Icon name="chevron--down" className="a11y-accordion-chevron" />
          </button>
        </h2>
        )}
      </div>

      {/* Stays visible when collapsed, and that is not a detail. With it hidden
          inside the panel this section shrank to a bare title, while every
          other section on the page shows a title and a line saying what it is
          — so it stopped reading as a section at all and became a stray
          heading between two tall ones. Easy to scroll straight past, which is
          exactly what happened. */}
      <p className="a11y-section-desc">
        {t(
          "Built from the page’s code. Real screen readers word things differently."
        )}
      </p>
      </div>

      {/* The controls are one card that stays on screen when the section is
          closed, so Play is reachable without opening it (it used to sit
          beside the accordion toggle and wrapped into the heading's focus
          ring on a narrow column). Play comes first and is the solid pill;
          the filter and the skip link only make sense beside the transcript,
          so they appear with it. */}
      {/* While it reads, the bar holds the whole transport and sticks to
          the top of the scroll, so Stop is in reach however far down the
          transcript the highlighted line has gone (user's report,
          24 Nov 2026: "there is no way to stop screen reader from reading
          page"). The first button is one element throughout, Play, Pause,
          Resume, so the focus that pressed it stays on it. */}
      <div className="a11y-sr-bar" data-active={active ? "true" : undefined}>
        {supported && (
        <button
          ref={playRef}
          type="button"
          className="a11y-btn a11y-btn-primary a11y-sr-play"
          onClick={() => {
            const p = playerRef.current;
            if (!p) return;
            if (player.status === "playing") {
              p.pause();
              return;
            }
            if (player.status === "paused") {
              p.resume();
              return;
            }
            // Opening on play is the point of having the button out here:
            // you press it from a closed section and the transcript is there
            // to follow, with the current line highlighted as it reads.
            setOpen(true);
            p.play(0);
          }}
        >
          {player.status === "playing" ? (
            <>
              <Icon name="pause--filled" /> {t("Pause")}
            </>
          ) : player.status === "paused" ? (
            <>
              <Icon name="play--filled--alt" /> {t("Resume")}
            </>
          ) : (
            <>
              <Icon name="play--filled--alt" /> {t("Play the page aloud")}
            </>
          )}
        </button>
        )}
        {supported && active && (
          <span
            className="a11y-sr-transport"
            onFocus={() => {
              transportFocusRef.current = true;
            }}
            onBlur={(e) => {
              if (e.relatedTarget && e.relatedTarget !== playRef.current) transportFocusRef.current = false;
            }}
          >
            <button
              type="button"
              className="a11y-btn a11y-sr-ctl"
              aria-keyshortcuts="ArrowLeft"
              onClick={() => playerRef.current?.previous()}
            >
              <Icon name="skip--back--filled" /> {t("Previous line")}
            </button>
            <button
              type="button"
              className="a11y-btn a11y-sr-ctl"
              aria-keyshortcuts="ArrowRight"
              onClick={() => playerRef.current?.next()}
            >
              <Icon name="skip--forward--filled" /> {t("Next line")}
            </button>
            <button
              type="button"
              className="a11y-btn a11y-sr-ctl"
              aria-keyshortcuts="Escape"
              onClick={() => {
                playerRef.current?.stop();
                playRef.current?.focus({ preventScroll: true });
              }}
            >
              <Icon name="stop--filled--alt" /> {t("Stop")}
            </button>
          </span>
        )}
        {/* The status span stays mounted while empty: a live region that
            appears already carrying text announces unreliably. Not a live
            region: the utterance is the audio feedback, and announcing each
            line would talk over it. The highlighted row carries the same
            progress for sighted users. */}
        {supported ? (
          <span className="a11y-sr-status">
            {player.status === "playing"
              ? tf("On line {line} of {total}", { line: (current ?? 0) + 1, total: lines.length })
              : player.status === "paused"
                ? tf("Paused on line {line} of {total}", { line: (current ?? 0) + 1, total: lines.length })
                : ""}
          </span>
        ) : null}
        {/* The keys, said once in words while they work. The buttons carry
            them as aria-keyshortcuts too. */}
        {supported && active && (
          <p className="a11y-sr-keys">
            {t("Esc stops reading. The left and right arrow keys go back or on one line.")}
          </p>
        )}
        {!supported && (
          <p className="a11y-sr-status">
            {t("Your browser can't play audio for this, so read the transcript below instead.")}
          </p>
        )}
      </div>

      {/* The filter and the skip link sit in a row of their own under the
          bar, so only the transport sticks: on a 375px phone the whole bar
          stuck was 300px, more than a third of the screen. */}
      {panelOpen && (issueCount > 0 || filtered.length > 12) && (
      <div className="a11y-sr-bar a11y-sr-tools">
        {issueCount > 0 && (
          <label className="a11y-ai-toggle a11y-sr-filter">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
            />
            {/* The checkbox is clipped, not removed: it stays the control and
                its name is the label. The mark shows its state on the pill. */}
            {onlyIssues && <Icon name="checkmark" />}
            {issueCount === 1
              ? t("Only the one that says nothing useful")
              : tf("Only the {count} that say nothing useful", { count: issueCount })}
          </label>
        )}
        {/* A row-by-row transcript is exactly the kind of block WCAG 2.4.1
            exists for: on a normal page it is over a hundred consecutive tab
            stops, one per play button. */}
        {filtered.length > 12 && (
          <button
            type="button"
            className="a11y-skip-link"
            onClick={() => showAllRef.current?.focus()}
          >
            {t("Skip the transcript")}
          </button>
        )}
      </div>
      )}

      {/* Hidden rather than unrendered: the accordion button's aria-controls
          points here, and it must never point at an element that does not
          exist. */}
      <div id={panelId} hidden={!panelOpen}>

      {/* The design's announcement log: a light card on the report's own
          ground, white pill rows, the silent lines tinted purple with
          their note inline. Supersedes the black kit panel — the design
          project's later "Screen reader panel" card is the current
          reference. Every behaviour of the panel it replaces survives:
          play-from-here is still the row itself with its purpose in the
          accessible name, aria-current marks the line being read, and
          the header strip is aria-hidden because a list has no columns
          for a listener. */}
      <div className="a11y-sr-log">
        <p className="a11y-sr-log-heads" aria-hidden="true">
          <span>#</span>
          <span>{t("What you’d hear")}</span>
          <span>{t("Note")}</span>
        </p>
        <ol className="a11y-sr-list" aria-label={t("Announcement order")}>
          {visible.map(({ line, index: i }) => (
            <li key={`${line.selector}-${i}`}>
              {supported ? (
                <button
                  type="button"
                  className="a11y-sr-row"
                  aria-current={current === i ? "true" : undefined}
                  data-issue={line.issue ? "true" : undefined}
                  onClick={() => speakFrom(i)}
                >
                  <span className="a11y-sr-num" aria-hidden="true">{i + 1}</span>
                  <span className="a11y-sr-line-text">{line.text}</span>
                  <span className="a11y-sr-only">. {t("Play aloud from this line")}</span>
                  {line.issue && <span className="a11y-sr-issue">{line.issue}</span>}
                </button>
              ) : (
                <p className="a11y-sr-row" data-issue={line.issue ? "true" : undefined}>
                  <span className="a11y-sr-num" aria-hidden="true">{i + 1}</span>
                  <span className="a11y-sr-line-text">{line.text}</span>
                  {line.issue && <span className="a11y-sr-issue">{line.issue}</span>}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* A toggle rather than a button that removes itself: a control that
          disappears under the keyboard focus that just used it strands the
          user at the top of the page. */}
      {filtered.length > 12 && (
        <button
          ref={showAllRef}
          type="button"
          className="a11y-show-all"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? t("Show fewer")
            : onlyIssues
              ? tf("Show all {count} with problems", { count: filtered.length })
              : tf("Show all {count} announcements", { count: filtered.length })}
        </button>
      )}
      {script.truncated && (
        <p className="a11y-sr-note">
          {t("This shows only the first part of the page.")}
        </p>
      )}
      </div>
    </section>
  );
}
