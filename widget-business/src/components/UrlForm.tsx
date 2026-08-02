import { useState, type FormEvent } from "react";
import { Button, Radio } from "@verify/design-system";
import { LoginFields } from "./LoginFields";
import { PrintButton } from "./PrintButton";
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
    <>
      {/* The kit's NewScan opens with its own heading and one-line
          subtitle before the card. The kit's sentence says WCAG 2.2; ours
          says what this scan actually measures. */}
      <h2 className="a11y-section-title a11y-newscan-title">New scan</h2>
      <p className="a11y-newscan-sub">
        We audit the page against WCAG 2.1 AA and explain what to fix.
      </p>
    <form className="a11y-url-form" onSubmit={handleSubmit} noValidate>
      {/* The kit's NewScan composition: a quiet card, two columns, and the
          actions gathered in a hairline-topped footer. Our content and our
          contracts (persistent error region, described-by hints, login
          fields) ride inside it. */}
      <div className="a11y-form-grid">
        <div className="a11y-form-col">
          <label className="a11y-url-label" htmlFor="a11y-url-input">
            Your website address
          </label>
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
            aria-describedby={showEmptyError ? "a11y-url-error" : "a11y-url-hint"}
          />
          {/* The kit's helper line under the field, kept true per scope. */}
          <span id="a11y-url-hint" className="a11y-group-hint">
            {mode === "site"
              ? "We scan every page we can reach."
              : "We scan this one page and everything visible on it."}
          </span>
          {/* Persistent and empty until filled — a live region mounted with
              its message already inside never announces. */}
          <p id="a11y-url-error" className="a11y-error a11y-url-error" role="alert">
            {showEmptyError ? "Enter a website address first. For example: example.com." : ""}
          </p>

          <fieldset className="a11y-radio-group">
            <legend>Report style</legend>
            <Radio
              id="a11y-aud-biz"
              name="a11y-audience"
              value="business"
              label="For business owners"
              checked={audience === "business"}
              onChange={() => onAudienceChange("business")}
            />
            <Radio
              id="a11y-aud-pro"
              name="a11y-audience"
              value="professional"
              label="For professionals"
              checked={audience === "professional"}
              onChange={() => onAudienceChange("professional")}
            />
            <span className="a11y-group-hint">
              Business owners get a plain-language summary; professionals get a
              WCAG-mapped technical report.
            </span>
          </fieldset>
        </div>

        <div className="a11y-form-col">
          <fieldset className="a11y-radio-group">
            <legend>Scan scope</legend>
            <Radio
              id="a11y-scope-page"
              name="a11y-scan-mode"
              value="page"
              label="This page"
              checked={mode === "page"}
              onChange={() => setMode("page")}
              disabled={loading}
            />
            <Radio
              id="a11y-scope-site"
              name="a11y-scan-mode"
              value="site"
              label="Whole site"
              checked={mode === "site"}
              onChange={() => setMode("site")}
              disabled={loading}
            />
            <span className="a11y-group-hint">
              This page takes about 15 seconds; whole site finds what repeats
              on every page.
            </span>
          </fieldset>

          {mode === "site" && (
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
          )}

          {mode === "page" && (
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

          {mode === "page" && (
            <LoginFields auth={auth} onChange={setAuth} disabled={loading} />
          )}
        </div>
      </div>

      <div className="a11y-form-footer">
        <Button type="submit" disabled={loading}>
          {loading ? "Checking…" : mode === "site" ? "Audit my site" : "Check my site"}
        </Button>
        {/* Business mode prints from here, the kit's footer; professionals
            have Export report in the report's own action row. */}
        {audience === "business" && <PrintButton />}
      </div>
    </form>
    </>
  );
}
