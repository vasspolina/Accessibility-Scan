import { useState, type FormEvent } from "react";
import { LoginFields } from "./LoginFields";
import type { AuthConfig } from "../api/scanClient";
import type { AudienceMode } from "../lib/audienceMode";

export type ScanMode = "page" | "site";

export function UrlForm({
  onSubmit,
  loading,
  audience,
  onAudienceChange,
}: {
  onSubmit: (
    url: string,
    includeAiReview: boolean,
    mode: ScanMode,
    maxPages: number,
    auth?: AuthConfig
  ) => void;
  loading: boolean;
  // Presentation only. Lives in App so flipping it re-renders a report that
  // is already in hand — it is never sent with the scan request.
  audience: AudienceMode;
  onAudienceChange: (mode: AudienceMode) => void;
}) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ScanMode>("page");
  const [maxPages, setMaxPages] = useState(5);
  // Off by default: the rule-based scan returns in ~15s, the AI review adds
  // ~25s on top. Most people want an answer quickly and can opt into the
  // deeper pass; making everyone wait 40s for their first result is the
  // faster way to lose them.
  const [includeAiReview, setIncludeAiReview] = useState(false);
  const [auth, setAuth] = useState<AuthConfig | undefined>(undefined);

  // Empty-submit error, replacing a button that used to sit disabled until a
  // URL was typed. Our own scan flagged that pattern on this very form: a
  // keyboard or screen-reader user met "button, disabled" with no explanation
  // of why or what to do. Now the button always works and an empty submit
  // says what is missing, in a message the input points at and a live region
  // announces.
  const [showEmptyError, setShowEmptyError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setShowEmptyError(true);
      return;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onSubmit(withProtocol, includeAiReview, mode, maxPages, auth);
  }

  return (
    <form className="a11y-url-form" onSubmit={handleSubmit} noValidate>
      <label className="a11y-url-label" htmlFor="a11y-url-input">
        Your website address
      </label>
      <div className="a11y-url-row">
        <input
          id="a11y-url-input"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="example.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (e.target.value.trim()) setShowEmptyError(false);
          }}
          disabled={loading}
          required
          aria-invalid={showEmptyError || undefined}
          aria-describedby={showEmptyError ? "a11y-url-error" : undefined}
        />
        <button type="submit" disabled={loading}>
          {/* A scan runs for anything from fifteen seconds to a minute and a
              half. A button that just says "Checking…" and then sits there
              looks like it has died — the spinner is the only thing telling
              the reader it hasn't. Hidden from screen readers because the
              status text below already announces progress. */}
          {loading && <span className="a11y-spinner" aria-hidden="true" />}
          {loading ? "Checking…" : mode === "site" ? "Audit my site" : "Check my site"}
        </button>
      </div>
      {/* Persistent and empty until filled — a live region mounted with its
          message already inside never announces. Kept in the DOM when clear
          (collapsed by the :empty style) for the same reason. */}
      <p id="a11y-url-error" className="a11y-error a11y-url-error" role="alert">
        {showEmptyError ? "Enter a website address first. For example: example.com." : ""}
      </p>

      {/* The Forms reference styles exclusive choices as what they are:
          radio groups. That is also the better semantic than the previous
          aria-pressed cards — native radios announce "2 of 2", arrow keys
          move within the group, and the checked state needs no invented
          marker. The audience group stays enabled while loading: it
          changes nothing about the scan, and someone who realises
          mid-scan they wanted the other rendering should not wait. */}
      <fieldset className="a11y-radio-group">
        <legend>Who the report is for</legend>
        <label className="a11y-radio">
          <input
            type="radio"
            name="a11y-audience"
            checked={audience === "business"}
            onChange={() => onAudienceChange("business")}
          />
          <span>
            For business owners
            <em>Plain-language summary, no technical background needed</em>
          </span>
        </label>
        <label className="a11y-radio">
          <input
            type="radio"
            name="a11y-audience"
            checked={audience === "professional"}
            onChange={() => onAudienceChange("professional")}
          />
          <span>
            For professionals
            <em>Designers &amp; developers — WCAG-mapped technical report</em>
          </span>
        </label>
      </fieldset>

      <fieldset className="a11y-radio-group">
        <legend>What to check</legend>
        <label className="a11y-radio">
          <input
            type="radio"
            name="a11y-scan-mode"
            checked={mode === "page"}
            onChange={() => setMode("page")}
            disabled={loading}
          />
          <span>
            This page
            <em>Everything we can see, in about 15 seconds</em>
          </span>
        </label>
        <label className="a11y-radio">
          <input
            type="radio"
            name="a11y-scan-mode"
            checked={mode === "site"}
            onChange={() => setMode("site")}
            disabled={loading}
          />
          <span>
            Whole site
            <em>Finds what repeats on every page</em>
          </span>
        </label>
      </fieldset>

      {mode === "page" && (
        <LoginFields auth={auth} onChange={setAuth} disabled={loading} />
      )}

      {mode === "site" ? (
        <label className="a11y-ai-toggle" htmlFor="a11y-pages">
          Pages to check
          <select
            id="a11y-pages"
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            disabled={loading}
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} pages (about {Math.ceil((n * 15) / 60)} min)
              </option>
            ))}
          </select>
        </label>
      ) : (
        // Short label, separate description — a checkbox whose label is a
        // whole sales sentence gets that sentence read on every focus. The
        // description is still announced, once, as a description.
        <div className="a11y-ai-toggle">
          <label>
            <input
              type="checkbox"
              checked={includeAiReview}
              onChange={(e) => setIncludeAiReview(e.target.checked)}
              disabled={loading}
              aria-describedby="a11y-ai-hint"
            />
            Include AI-powered review
          </label>
          <span id="a11y-ai-hint" className="a11y-ai-hint">
            Catches design and marketing issues automated tools miss. Adds
            about half a minute.
          </span>
        </div>
      )}
    </form>
  );
}
