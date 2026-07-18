import { useState, type FormEvent } from "react";

export function UrlForm({
  onSubmit,
  loading,
}: {
  onSubmit: (url: string, includeAiReview: boolean) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const [includeAiReview, setIncludeAiReview] = useState(true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onSubmit(withProtocol, includeAiReview);
  }

  return (
    <form className="a11y-url-form" onSubmit={handleSubmit}>
      <label className="a11y-url-label" htmlFor="a11y-url-input">
        Website URL
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
          {loading ? "Scanning…" : "Scan"}
        </button>
      </div>
      <label className="a11y-ai-toggle">
        <input
          type="checkbox"
          checked={includeAiReview}
          onChange={(e) => setIncludeAiReview(e.target.checked)}
          disabled={loading}
        />
        Include AI judgment review (design clarity &amp; marketing red flags)
      </label>
    </form>
  );
}
