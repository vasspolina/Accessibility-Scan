import { t, tf } from "../lib/strings";
import { LanguageSelect } from "./LanguageSelect";
import type { Lang } from "../lib/i18n";
import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
// The ported Select, not FormControls' — same API, so this is an import
// change and nothing else. FormControls' Select still serves its other
// callers until they move across too.
import { Select } from "./Select2";
// The ported Radio, not FormControls' — it carries the per-option description
// the design puts on each choice instead of one hint under both.
import { Input } from "./Input";
import { SCAN_DURATION } from "../lib/scanDuration";
import { Switch } from "./Switch";
import { LoginFields } from "./LoginFields";
import type { AuthConfig } from "../api/scanClient";
import type { AudienceMode } from "../lib/audienceMode";
import { Button } from "./Button";

export type ScanMode = "page" | "site";

// One choice in a tester pill: the radio itself is clipped (it stays for
// keyboards and screen readers, its focus ring drawn on the segment), and
// the segment fills black when chosen.
function Seg(props: { id: string; name: string; value: string; label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label htmlFor={props.id} className={"a11y-seg" + (props.checked ? " a11y-seg-on" : "") + (props.disabled ? " a11y-seg-disabled" : "")}>
      <input
        type="radio"
        id={props.id}
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        disabled={props.disabled}
      />
      <span>{props.label}</span>
    </label>
  );
}


export function UrlForm({
  onSubmit,
  loading,
  audience,
  onAudienceChange,
  hasReport,
  scanError,
  scanBlocked,
  progress,
  language,
  onLanguageChange,
}: {
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
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
  // On by default (user's instruction, 17 Nov 2026), with the switch as the
  // opt-out. It was off because the rule-based scan returns in ~15s and the
  // AI review adds ~25s; it now also writes the AI fix for each element
  // (backend aiReview/suggestCodeFix.ts), which runs beside the review and
  // adds no time of its own. The backend's own default was already on.
  const [includeAiReview, setIncludeAiReview] = useState(true);
  const [auth, setAuth] = useState<AuthConfig | undefined>(undefined);

  // Empty-submit error, replacing a button that used to sit disabled until a
  // URL was typed. Our own scan flagged that pattern on this very form: a
  // keyboard or screen-reader user met "button, disabled" with no explanation
  // of why or what to do. Now the button always works and an empty submit
  // says what is missing, in a message the input points at and a live region
  // announces.
  /* The login disclosure's state lives here because its trigger sits inside
     the address field and its panel below. See LoginFields. */
  const [loginOpen, setLoginOpen] = useState(false);
  const loginPanelId = useId();
  const loginToggleRef = useRef<HTMLButtonElement>(null);
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
      // The error is associated and announced; focus goes to the field it
      // is about, so the next keystroke is the correction.
      (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("#a11y-url-input")?.focus();
      return;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let hostname: string;
    try {
      hostname = new URL(withProtocol).hostname;
    } catch {
      setShowInvalidError(true);
      (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("#a11y-url-input")?.focus();
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

  /* The scan form as a foundry's type tester (user's reference, 18 Nov 2026,
     "create new inspired by reference design"): one card; along the top the
     tester's row of pills, the name first in black ("New scan", where the
     tester names its typeface), then the settings as white pills, the way
     the tester carries its weight menu and its Size, Leading and Spacing
     controls; under them a row of small chips with the chosen settings'
     small print, where the tester lists its alternates; then the specimen,
     the address typed at display size straight onto the card; the action
     last. DOM order is the visual order. */
  return (
    <form
      className="a11y-url-form a11y-tester"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="a11y-newscan-title"
    >
      <div className="a11y-tester-bar">
        <h2 className="a11y-tester-name" id="a11y-newscan-title">{t("New scan")}</h2>
        {/* Before the scan, because the language rides with the request:
            the checklist comes back written in it. */}
        <LanguageSelect id="a11y-lang-form" value={language} onChange={onLanguageChange} />
        <div className="a11y-tester-controls">
          {/* Not "How much?" — that reads as price, and this is scope. */}
          <div className="a11y-tester-pill" role="radiogroup" aria-labelledby="a11y-scope-q">
            <span className="a11y-tester-pill-label" id="a11y-scope-q">{t("How much of it?")}</span>
            <Seg id="a11y-scope-page" name="a11y-scan-mode" value="page" label={t("This page")}
              checked={mode === "page"} onChange={() => setMode("page")} disabled={loading} />
            <Seg id="a11y-scope-site" name="a11y-scan-mode" value="site" label={t("Whole site")}
              checked={mode === "site"} onChange={() => setMode("site")} disabled={loading} />
          </div>
          {/* "For everyone", not "Business owners": the report is written for
              whoever has to act on it. */}
          <div className="a11y-tester-pill" role="radiogroup" aria-labelledby="a11y-aud-q">
            <span className="a11y-tester-pill-label" id="a11y-aud-q">{t("Who reads it?")}</span>
            <Seg id="a11y-aud-biz" name="a11y-audience" value="business" label={t("For everyone")}
              checked={audience === "business"} onChange={() => onAudienceChange("business")} />
            <Seg id="a11y-aud-pro" name="a11y-audience" value="professional" label={t("Professionals")}
              checked={audience === "professional"} onChange={() => onAudienceChange("professional")} />
          </div>
          {mode === "page" ? (
            <div className="a11y-tester-pill a11y-tester-ai">
              <Switch
                id="a11y-ai"
                label={t("AI review")}
                checked={includeAiReview}
                onChange={setIncludeAiReview}
                disabled={loading}
              />
            </div>
          ) : (
            <Select
              id="a11y-pages"
              label={t("Pages to check")}
              value={String(maxPages)}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setMaxPages(Number(e.target.value))}
              disabled={loading}
              options={[3, 5, 8, 10].map((n) => ({
                value: String(n),
                label: tf("{count} pages (about {minutes} min)", {
                  count: n,
                  minutes: Math.ceil((n * 15) / 60),
                }),
              }))}
            />
          )}
        </div>
      </div>

      {/* The chosen settings' small print, as the tester's row of chips. */}
      <ul className="a11y-tester-chips" role="list">
        <li>
          {mode === "site"
            ? tf("A whole site takes {duration}", { duration: t(SCAN_DURATION.site) })
            : tf("This page takes {duration}", { duration: t(SCAN_DURATION.page) })}
        </li>
        {mode === "site" && <li>{t("Up to five pages from this address. Lists what repeats across them")}</li>}
        <li>
          {audience === "professional"
            ? t("Each finding with its WCAG number, selector and code")
            : t("What is wrong, who fixes it, and what it costs you, in plain words")}
        </li>
        <li id="a11y-url-hint">{t("Public pages only.")}</li>
        {mode === "page" && includeAiReview && (
          <li id="a11y-ai-hint">
            {t("A language model reads the page for design and wording faults, and writes a code fix for each fault it can correct. It can be wrong.")}{" "}
            {tf("Adds {duration}.", { duration: t(SCAN_DURATION.aiAdds) })}
          </li>
        )}
      </ul>

      {/* The specimen: the address at display size. describedBy is one of
          four ids depending on the error state. */}
      <Input
        id="a11y-url-input"
        size="display"
        label={t("Website address (required)")}
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
        action={
          /* Stays mounted whether the panel is open or shut, so keyboard
             focus always has somewhere to live. */
          <button
            ref={loginToggleRef}
            type="button"
            className="a11y-login-toggle"
            aria-expanded={loginOpen}
            aria-controls={loginPanelId}
            onClick={() => setLoginOpen(!loginOpen)}
            disabled={loading}
          >
            {t("Behind a login")}
          </button>
        }
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

      <LoginFields
        auth={auth}
        onChange={setAuth}
        disabled={loading}
        open={loginOpen}
        setOpen={setLoginOpen}
        panelId={loginPanelId}
        toggleRef={loginToggleRef}
      />

      {/* Persistent and empty until filled: a live region mounted with its
          message already inside never announces. */}
      <p id="a11y-url-error" className="a11y-error a11y-url-error" role="alert">
        {showEmptyError
          ? t("Enter a website address first. For example: example.com.")
          : showInvalidError
            ? t("That doesn't look like a website address. For example: example.com.")
            : ""}
      </p>

      {progress}

      <div className="a11y-url-submit">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? t("One moment…") : t("Start the scan")}
        </Button>
        <span className="a11y-url-submit-note">
          {t("Keep this page open. The scan runs here.")}
        </span>
      </div>
    </form>
  );
}
