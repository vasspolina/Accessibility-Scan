import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { StatusChip } from "./SectionHeader";
import { DataTable } from "@verify/design-system";
import type { ScreenReaderScript } from "../api/scanClient";

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

export function ScreenReaderPreview({ script }: { script: ScreenReaderScript }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Whether the accordion is open. Closed by default: this is the longest
  // section in the report and the one you consult rather than read.
  const [open, setOpen] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const panelId = useId();
  // Guards against an utterance that finished because we cancelled it
  // advancing playback — cancel() fires onend just like a natural finish.
  const stoppedRef = useRef(false);
  const supported = useMemo(speechSupported, []);

  const lines = script.lines;
  const issueCount = useMemo(() => lines.filter((l) => l.issue).length, [lines]);

  // Always stop speaking when the component goes away or the report changes —
  // audio outliving the thing that started it is jarring and inescapable.
  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (speechSupported()) window.speechSynthesis.cancel();
    setPlaying(false);
    setCurrent(null);
  }, []);

  useEffect(() => stop, [stop]);

  const speakFrom = useCallback(
    (startIndex: number) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      setPlaying(true);

      const speakAt = (i: number) => {
        if (stoppedRef.current || i >= lines.length) {
          setPlaying(false);
          setCurrent(null);
          return;
        }
        setCurrent(i);
        const utterance = new SpeechSynthesisUtterance(lines[i].text);
        // A little quicker than default: real screen-reader users run far
        // faster than this, but much beyond 1.2 stops being intelligible to
        // someone hearing it for the first time.
        utterance.rate = 1.15;
        utterance.onend = () => {
          if (!stoppedRef.current) speakAt(i + 1);
        };
        utterance.onerror = () => {
          setPlaying(false);
          setCurrent(null);
        };
        window.speechSynthesis.speak(utterance);
      };
      speakAt(startIndex);
    },
    [lines, supported]
  );

  if (lines.length === 0) return null;

  // Keep each line's original position. Playback indexes into the full script,
  // so filtering the view must not renumber it — otherwise "play from here"
  // starts somewhere else entirely.
  const entries = lines.map((line, index) => ({ line, index }));
  const filtered = onlyIssues ? entries.filter((e) => e.line.issue) : entries;
  const visible = expanded ? filtered : filtered.slice(0, 12);

  return (
    <section className="a11y-section a11y-sr">
      {/* Carbon accordion. This section is the longest thing in the report by
          a wide margin — 120 rows on a normal page — and it is supplementary:
          you open it to hear a problem, not to read it end to end. Collapsed
          by default it costs one row instead of a screenful.

          The heading holds the button rather than sitting inside it, so the
          heading stays a heading in the accessibility tree and screen-reader
          users can still jump between sections by heading. */}
      {/* Play sits beside the accordion toggle rather than inside it. Nesting a
          button in a button is invalid HTML and assistive tech handles it
          unpredictably, so the two are siblings in one row and the rule that
          closes the header belongs to the row. */}
      <div className="a11y-accordion-row">
        <h2 className="a11y-section-title a11y-accordion-title">
          <button
            type="button"
            className="a11y-accordion-head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span>
              Screen reader preview{" "}
              <span className="a11y-section-count">({lines.length} announcements)</span>
            </span>
            {/* The count of problems stays visible while collapsed. A closed
                section with nothing to show for it gives no reason to open it. */}
            {issueCount > 0 && (
              <StatusChip>
                {issueCount === 1 ? "1 says nothing useful" : `${issueCount} say nothing useful`}
              </StatusChip>
            )}
            <svg className="a11y-accordion-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M8 11L3 6l.7-.7L8 9.6l4.3-4.3L13 6z" fill="currentColor" />
            </svg>
          </button>
        </h2>
        {supported && (
          <button
            type="button"
            className="a11y-sr-play"
            onClick={() => {
              if (playing) {
                stop();
                return;
              }
              // Opening on play is the point of having the button out here:
              // you press it from a closed section and the transcript is there
              // to follow, with the current line highlighted as it reads.
              setOpen(true);
              speakFrom(current ?? 0);
            }}
          >
            {playing ? "■ Stop" : "▶ Play the page aloud"}
          </button>
        )}
      </div>

      {/* Stays visible when collapsed, and that is not a detail. With it hidden
          inside the panel this section shrank to a bare title, while every
          other section on the page shows a title and a line saying what it is
          — so it stopped reading as a section at all and became a stray
          heading between two tall ones. Easy to scroll straight past, which is
          exactly what happened. */}
      <p className="a11y-section-desc">
        How your page sounds to someone who can't see it, in the order they hear it. Lines marked
        &ldquo;says nothing useful&rdquo; are where a listener learns nothing. Close to a real
        screen reader, not a recording.
      </p>

      {/* Hidden rather than unrendered: the accordion button's aria-controls
          points here, and it must never point at an element that does not
          exist. */}
      <div id={panelId} hidden={!open}>
      <div className="a11y-sr-controls">
        {/* Play itself now lives in the header row above, so it is reachable
            without opening the section. What stays here is what only makes
            sense alongside the transcript.

            The status span stays mounted while empty — a live region that
            appears already carrying text announces unreliably. */}
        {supported ? (
          <span className="a11y-sr-status" role="status">
            {playing ? `On line ${(current ?? 0) + 1} of ${lines.length}` : ""}
          </span>
        ) : (
          <p className="a11y-sr-status">
            Your browser can't play audio for this, so the transcript below is read only.
          </p>
        )}
        {/* Filtering beats paging here. Carbon would page a 120-row data
            table, but this is a reading order, and page 4 of 10 of a
            narrative is meaningless. What a reader actually wants is the 16
            lines that go wrong, which is the same "show only what's failing"
            control the conformance list already uses. */}
        {issueCount > 0 && (
          <label className="a11y-ai-toggle">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
            />
            {issueCount === 1
              ? "Only the one that says nothing useful"
              : `Only the ${issueCount} that say nothing useful`}
          </label>
        )}
      </div>

      {/* The walkthrough as the kit's table: order, what you would hear,
          and the note. Issue rows wear the critical tint; the row currently
          being read aloud wears the accent wash. The play-from-here button
          stays the line itself, its purpose in the accessible name. */}
      <DataTable
        caption="What a screen reader announces, in reading order"
        headers={[
          { key: "n", label: "#", align: "right", width: "56px" },
          { key: "text", label: "What you'd hear" },
          { key: "note", label: "Note" },
        ]}
        rows={visible.map(({ line, index: i }) => ({
          id: `${line.selector}-${i}`,
          background: line.issue
            ? "var(--severity-critical-bg, #fff1f1)"
            : current === i
              ? "var(--a11y-accent-faint, #edf5ff)"
              : undefined,
          cells: [
            String(i + 1),
            <span key="t" className="a11y-sr-text">
              {supported ? (
                <button type="button" className="a11y-sr-line-play" onClick={() => speakFrom(i)}>
                  {line.text}
                  <span className="a11y-sr-only"> — play aloud from this line</span>
                </button>
              ) : (
                line.text
              )}
            </span>,
            line.issue ? <span key="n" className="a11y-sr-issue">{line.issue}</span> : "",
          ],
        }))}
      />

      {/* A toggle rather than a button that removes itself: a control that
          disappears under the keyboard focus that just used it strands the
          user at the top of the page. */}
      {filtered.length > 12 && (
        <button
          type="button"
          className="a11y-show-all"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Show fewer"
            : `Show all ${filtered.length}${onlyIssues ? " with problems" : " announcements"}`}
        </button>
      )}
      {script.truncated && (
        <p className="a11y-sr-note">
          Only the first part of the page is shown. Long pages are cut short to keep this readable.
        </p>
      )}
      </div>
    </section>
  );
}
