import { useState, type FormEvent } from "react";

export type ScanMode = "page" | "site";

export function UrlForm({
  onSubmit,
  loading,
}: {
  onSubmit: (url: string, includeAiReview: boolean, mode: ScanMode, maxPages: number) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ScanMode>("page");
  const [maxPages, setMaxPages] = useState(5);
  // Off by default: the rule-based scan returns in ~15s, the AI review adds
  // ~25s on top. Most people want an answer quickly and can opt into the
  // deeper pass; making everyone wait 40s for their first result is the
  // faster way to lose them.
  const [includeAiReview, setIncludeAiReview] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onSubmit(withProtocol, includeAiReview, mode, maxPages);
  }

  return (
    <form className="a11y-url-form" onSubmit={handleSubmit}>
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
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? "Checking…" : mode === "site" ? "Audit my site" : "Check my site"}
        </button>
      </div>

      <div className="a11y-mode" role="group" aria-label="What to check">
        <button
          type="button"
          className={`a11y-mode-btn${mode === "page" ? " a11y-mode-btn-active" : ""}`}
          aria-pressed={mode === "page"}
          onClick={() => setMode("page")}
          disabled={loading}
        >
          This page
          <em>Everything we can see, in about 15 seconds</em>
        </button>
        <button
          type="button"
          className={`a11y-mode-btn${mode === "site" ? " a11y-mode-btn-active" : ""}`}
          aria-pressed={mode === "site"}
          onClick={() => setMode("site")}
          disabled={loading}
        >
          Whole site
          <em>Finds what repeats on every page</em>
        </button>
      </div>

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
        <label className="a11y-ai-toggle">
          <input
            type="checkbox"
            checked={includeAiReview}
            onChange={(e) => setIncludeAiReview(e.target.checked)}
            disabled={loading}
          />
          Include AI-powered review — catches design and marketing issues automated tools miss, but
          adds about half a minute
        </label>
      )}
    </form>
  );
}
