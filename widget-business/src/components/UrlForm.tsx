import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, Radio, Select } from "@verify/design-system";
import { LoginFields } from "./LoginFields";
import { PrintButton } from "./PrintButton";
import type { AuthConfig } from "../api/scanClient";
import type { AudienceMode } from "../lib/audienceMode";
import { WCAG_LINK } from "../lib/wcagPlain";

export type ScanMode = "page" | "site";

export function UrlForm({
  onSubmit,
  loading,
  audience,
  onAudienceChange,
  hasReport,
  scanError,
  scanBlocked,
  progress,
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
  // Save as PDF has nothing to export before a scan exists — the button
  // only earns its place in the footer once one does.
  hasReport: boolean;
  // A scan-level failure from the last submit (bad/unreachable URL, timeout,
  // backend error). Announced separately by App; here it only has to point
  // the field at where that text already lives, so a user who tabs back to
  // fix their typo lands on a field that says why it failed.
  scanError?: string | null;
  // Same idea for a bot-protection/CAPTCHA block — not the field's fault,
  // but still worth being discoverable from the field itself.
  scanBlocked?: string | null;
  // The progress bar and its status line, rendered by App (it owns the
  // elapsed-time state that drives them) but placed here, directly under
  // the search bar rather than below the whole form — Report style, Scan
  // scope and the rest keep their place even while a scan is running,
  // instead of the bar landing after all of them.
  progress?: ReactNode;
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
  // Separate from showEmptyError: this field is non-empty but isn't a
  // website address either — "jargon name" trimmed and non-empty passes
  // the empty-field check, gets a protocol stapled on, and used to be
  // handed straight to the scanner as https://jargon name, which isn't
  // even a syntactically valid URL. Caught here instead, before it ever
  // reaches onSubmit.
  const [showInvalidError, setShowInvalidError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setShowEmptyError(true);
      setShowInvalidError(false);
      return;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let hostname: string;
    try {
      hostname = new URL(withProtocol).hostname;
    } catch {
      setShowInvalidError(true);
      return;
    }
    // A hostname needs at least one dot to be a real domain — "jargon
    // name" parses to a URL object without throwing (spaces become %20,
    // and a hostname with no dot is technically legal), so the actual
    // check has to be this, not just whether `new URL` accepted it.
    if (!hostname.includes(".")) {
      setShowInvalidError(true);
      return;
    }
    setShowInvalidError(false);
    onSubmit(withProtocol, includeAiReview, mode, maxPages, auth);
  }

  return (
    <>
      {/* The kit's NewScan opens with its own heading and one-line
          subtitle before the card. The kit's sentence says WCAG 2.2; ours
          says what this scan actually measures — and names the standard
          with its link, which used to live in a separate intro paragraph
          above this form until that read as filler in front of the
          scanner rather than a reason to run it. */}
      <h2 className="a11y-section-title a11y-newscan-title" id="a11y-newscan-title">New scan</h2>
      <p className="a11y-newscan-sub">
        We audit the page against the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>{" "}
        2.1 AA and explain what to fix. It's the standard nearly every
        accessibility law builds on.
      </p>
    <form
      className="a11y-url-form"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="a11y-newscan-title"
    >
      {/* The kit's NewScan composition: a quiet card, two columns, and the
          actions gathered in a hairline-topped footer. Our content and our
          contracts (persistent error region, described-by hints, login
          fields) ride inside it. */}
      <div className="a11y-form-grid">
        <div className="a11y-form-col">
          <label className="a11y-url-label" htmlFor="a11y-url-input">
            Your website address (required)
          </label>
          {/* The submit button rejoins the field as one row — the kit's own
              search-plus-action pattern — rather than waiting in the
              footer below two columns of options. */}
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
                setShowInvalidError(false);
              }}
              disabled={loading}
              required
              aria-invalid={showEmptyError || showInvalidError || Boolean(scanError) || undefined}
              aria-describedby={
                showEmptyError || showInvalidError
                  ? "a11y-url-error"
                  : scanError
                    ? "a11y-scan-error"
                    : scanBlocked
                      ? "a11y-blocked-lead"
                      : "a11y-url-hint"
              }
            />
            <Button type="submit" disabled={loading}>
              {loading ? "One moment…" : mode === "site" ? "Audit my site" : "Check my site"}
            </Button>
          </div>
          {/* Directly under the search bar rather than below the whole
              form — see the `progress` prop's own comment above. */}
          {progress}
          {/* The kit's helper line under the field, kept true per scope. */}
          <span id="a11y-url-hint" className="a11y-group-hint">
            {mode === "site"
              ? "We scan every page we can reach."
              : "We scan this one page and everything visible on it."}
          </span>
          {/* Persistent and empty until filled — a live region mounted with
              its message already inside never announces. */}
          <p id="a11y-url-error" className="a11y-error a11y-url-error" role="alert">
            {showEmptyError
              ? "Enter a website address first. For example: example.com."
              : showInvalidError
                ? "That doesn't look like a website address. For example: example.com."
                : ""}
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
              Business owners get a plain language summary; professionals get a
              WCAG mapped technical report.
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
              This page takes twenty to forty seconds; whole site finds what repeats
              on every page.
            </span>
          </fieldset>

          {mode === "site" && (
            <Select
              id="a11y-pages"
              label="Pages to check"
              value={String(maxPages)}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setMaxPages(Number(e.target.value))}
              disabled={loading}
              options={[3, 5, 8, 10].map((n) => ({
                value: String(n),
                label: `${n} pages (about ${Math.ceil((n * 15) / 60)} min)`,
              }))}
            />
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
                Include AI review
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

      {/* The footer now holds only Save as PDF, and only once a scan
          exists to export — nothing to print before that, and an empty
          hairline-topped row would be a divider to nowhere. Professionals
          print from the report's own action row instead. */}
      {hasReport && audience === "business" && (
        <div className="a11y-form-footer">
          <PrintButton />
        </div>
      )}
    </form>
    </>
  );
}
