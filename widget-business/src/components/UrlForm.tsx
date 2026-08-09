import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
// The ported Select, not FormControls' — same API, so this is an import
// change and nothing else. FormControls' Select still serves its other
// callers until they move across too.
import { Select } from "./Select2";
// The ported Radio, not FormControls' — it carries the per-option description
// the design puts on each choice instead of one hint under both.
import { Input } from "./Input";
import { OptionCard } from "./OptionCard";
import { Switch } from "./Switch";
import { LoginFields } from "./LoginFields";
import { PrintButton } from "./PrintButton";
import type { AuthConfig } from "../api/scanClient";
import type { AudienceMode } from "../lib/audienceMode";
import { WCAG_LINK } from "../lib/wcagPlain";
import { Button } from "./Button";

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
        We audit every page we can reach against the{" "}
        <a href={WCAG_LINK} target="_blank" rel="noopener noreferrer">
          Web Content Accessibility Guidelines (WCAG)
        </a>{" "}
        2.2 and explain what to fix, in the order worth fixing it.
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
      {/* One column, in the order the design lays it out: address, scope,
          report style, the optional extras, then the action. DOM order IS
          visual order — reordering this with CSS `order` would leave tab
          order following the markup while the eye follows the layout. */}
      <div className="a11y-form-single">
          {/* The ported Input at display size. The submit button does NOT ride
              inside the field: the Checker screen puts the address full width
              on its rule and the button below it, which is what the design
              shows and the opposite of the search-plus-action row this used
              to be. describedBy is passed through
              rather than left to the component: this field's description is
              one of four ids depending on the error state, which the
              component's own ${id}-help cannot express. */}
          <div className="a11y-step-group">
          <span className="a11y-step-num" aria-hidden="true">01</span>
          <div className="a11y-step-body">
          <div className="a11y-step-head">
            <h3 className="a11y-step-q">Which site?</h3>
          </div>
          <Input
            id="a11y-url-input"
            size="display"
            label="Your website address (required)"
            placeholder="example.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value.trim()) setShowEmptyError(false);
              setShowInvalidError(false);
            }}
            disabled={loading}
            invalid={showEmptyError || showInvalidError || Boolean(scanError)}
            inputProps={{ inputMode: "url", autoComplete: "url", required: true }}
            describedBy={
              showEmptyError || showInvalidError
                ? "a11y-url-error"
                : scanError
                  ? "a11y-scan-error"
                  : scanBlocked
                    ? "a11y-blocked-lead"
                    : "a11y-url-hint"
            }
          />

          {progress}

          {/* The helper line carries the login trigger inline, which is where
              the reference puts it — not as a block between the AI card and
              the submit button. LoginFields still owns its own disclosure
              panel; that drops below this row when opened. */}
          <div className="a11y-url-helper-row">
            <span id="a11y-url-hint" className="a11y-group-hint">
              {mode === "site"
                ? "Public pages only."
                : "Public pages only."}
            </span>
            <LoginFields auth={auth} onChange={setAuth} disabled={loading} />
          </div>

          {/* The empty-submit / malformed-address message, beside the field it
              is about rather than at the foot of the form. Persistent and empty
              until filled — a live region mounted with its message already
              inside never announces. */}
          <p id="a11y-url-error" className="a11y-error a11y-url-error" role="alert">
            {showEmptyError
              ? "Enter a website address first. For example: example.com."
              : showInvalidError
                ? "That doesn't look like a website address. For example: example.com."
                : ""}
          </p>
          </div>
          </div>

          <div className="a11y-step-group">
          <span className="a11y-step-num" aria-hidden="true">02</span>
          <div className="a11y-step-body">
          {/* The note is a sibling of the heading, not a child of it: inside,
              it became part of the heading's accessible name. */}
          <div className="a11y-step-head">
            <h3 className="a11y-step-q">How much?</h3>
            <span className="a11y-step-note">
              {mode === "site" ? "A whole site takes a few minutes" : "This page takes about 15 seconds"}
            </span>
          </div>
          <fieldset className="a11y-radio-group a11y-optioncard-grid">
            <legend>Scan scope</legend>
            <OptionCard
              id="a11y-scope-page"
              name="a11y-scan-mode"
              value="page"
              label="This page"
              description="One page, end to end"
              /* Both badges are the design's own copy. "Fastest" is a fact
                 about this scan — one page against many. "Most chosen" is a
                 claim about what other people pick, and nothing here measures
                 that; it is carried because the design asks for it, not
                 because the app can support it. */
              meta="Fastest"
              checked={mode === "page"}
              onChange={() => setMode("page")}
              disabled={loading}
            />
            <OptionCard
              id="a11y-scope-site"
              name="a11y-scan-mode"
              value="site"
              label="Whole site"
              description="Finds what repeats everywhere"
              checked={mode === "site"}
              onChange={() => setMode("site")}
              disabled={loading}
            />
          </fieldset>

          </div>
          </div>

          <div className="a11y-step-group">
          <span className="a11y-step-num" aria-hidden="true">03</span>
          <div className="a11y-step-body">
          <div className="a11y-step-head">
            <h3 className="a11y-step-q">Who reads it?</h3>
          </div>
          <fieldset className="a11y-radio-group a11y-optioncard-grid">
            <legend>Report style</legend>
            <OptionCard
              id="a11y-aud-biz"
              name="a11y-audience"
              value="business"
              label="For business owners"
              description="Plain-language summary and costs"
              meta="Most chosen"
              checked={audience === "business"}
              onChange={() => onAudienceChange("business")}
            />
            <OptionCard
              id="a11y-aud-pro"
              name="a11y-audience"
              value="professional"
              label="For professionals"
              description="WCAG-mapped technical findings"
              checked={audience === "professional"}
              onChange={() => onAudienceChange("professional")}
            />
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
            <div className="a11y-ai-card">
              <span className="a11y-ai-card-text">
                <span className="a11y-ai-card-title">Add an AI review</span>
                <span id="a11y-ai-hint" className="a11y-ai-hint">
                  Catches design and marketing issues automated tools miss. Adds
                  about half a minute.
                </span>
              </span>
              <Switch
                id="a11y-ai"
                label="AI review"
                checked={includeAiReview}
                onChange={setIncludeAiReview}
                disabled={loading}
              />
            </div>
          )}

          </div>
          </div>

          {/* Back at the numerals' left edge, outside the step groups — the
              kit does not indent the action to the content column. */}
          <div className="a11y-url-submit">
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "One moment\u2026" : "Start the scan"}
            </Button>
            <span className="a11y-url-submit-note">
              Keep this page open — the scan runs here.
            </span>
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
