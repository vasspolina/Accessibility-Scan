import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const visible = expanded ? lines : lines.slice(0, 12);

  return (
    <section className="a11y-section a11y-sr">
      <h3 className="a11y-section-title">
        Your page, read aloud{" "}
        <span className="a11y-section-count">({lines.length} announcements)</span>
      </h3>
      <p className="a11y-section-desc">
        How your page sounds to someone who can't see it, in the order they hear it. Red lines are
        where a listener learns nothing. Close to a real screen reader, not a recording.
      </p>

      <div className="a11y-sr-controls">
        {supported ? (
          <>
            <button
              type="button"
              className="a11y-sr-play"
              onClick={() => (playing ? stop() : speakFrom(current ?? 0))}
            >
              {playing ? "■ Stop" : "▶ Play the page aloud"}
            </button>
            {playing && (
              <span className="a11y-sr-status" role="status">
                Reading line {(current ?? 0) + 1} of {lines.length}
              </span>
            )}
          </>
        ) : (
          <p className="a11y-sr-status">
            Your browser can't play audio for this, so the transcript below is read-only.
          </p>
        )}
        {issueCount > 0 && (
          <span className="a11y-sr-issue-count">
            {issueCount} announcement{issueCount === 1 ? "" : "s"} say nothing useful
          </span>
        )}
      </div>

      <ol className="a11y-sr-list">
        {visible.map((line, i) => (
          <li
            key={`${line.selector}-${i}`}
            className={[
              "a11y-sr-line",
              line.issue ? "a11y-sr-line-issue" : "",
              current === i ? "a11y-sr-line-current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="a11y-sr-text">
              {supported ? (
                <button
                  type="button"
                  className="a11y-sr-line-play"
                  onClick={() => speakFrom(i)}
                  title="Play from here"
                >
                  {line.text}
                </button>
              ) : (
                line.text
              )}
              {line.issue && <span className="a11y-sr-issue">{line.issue}</span>}
            </span>
          </li>
        ))}
      </ol>

      {lines.length > visible.length && (
        <button type="button" className="a11y-show-all" onClick={() => setExpanded(true)}>
          Show all {lines.length} announcements
        </button>
      )}
      {script.truncated && (
        <p className="a11y-sr-note">
          Only the first part of the page is shown. Long pages are cut short to keep this readable.
        </p>
      )}
    </section>
  );
}
