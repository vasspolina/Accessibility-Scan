import { t } from "../lib/strings";
import type { ReactNode } from "react";
import type { AudienceMode } from "../lib/audienceMode";
import type { ScanMode } from "./UrlForm";
import { LanguageSelect } from "./LanguageSelect";
import { Icon } from "./Icon";
import type { Lang } from "../lib/i18n";

/**
 * The run's settings, in the rail, changeable without scrolling back to the
 * form.
 *
 * The three are not equivalent, and the control says so rather than
 * flattening them into one row of identical switches:
 *
 *   Report style  presentation only — the scan is identical in both modes
 *                 and flipping re-renders the report already in hand. A real
 *                 switcher: instant, free, no network.
 *
 *   AI review     an argument to the scan. Changing it means running again.
 *   Scope         the same, and a whole-site run takes minutes rather than
 *                 seconds.
 *
 * So the first is a two-way switch and the other two are a state beside a
 * button that says what it costs. A toggle that silently spent forty
 * seconds — or, for a site audit, several minutes — would be the kind of
 * control this report files against other people's sites.
 *
 * Set as a form panel of pills (user's instruction, 25 Nov 2026): each
 * choice is a pill with a ring at its start, the ring filled on the
 * setting in force, so the three rows read alike while the words still say
 * which ones run the scan again.
 */

/** The ring at the start of a pill: filled, with a check, on the setting in
 *  force. A mark beside the words, never the words; aria-pressed and the
 *  state's own words say it to a screen reader. */
function Ring({ on }: { on: boolean }) {
  return (
    <span className="a11y-settings-ring" aria-hidden="true">
      {on && <Icon name="checkmark" />}
    </span>
  );
}

export function ScanSettings({
  audience,
  onAudienceChange,
  aiIncluded,
  scope,
  busy,
  onRerun,
  language,
  onLanguageChange,
  children,
}: {
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
  audience: AudienceMode;
  onAudienceChange: (m: AudienceMode) => void;
  aiIncluded: boolean;
  scope: ScanMode;
  busy: boolean;
  /** Runs the scan again with one setting changed. */
  onRerun: (next: { ai?: boolean; scope?: ScanMode }) => void;
  /** The account rows, set inside the same panel. */
  children?: ReactNode;
}) {
  // The setting in force, as a pill with the filled ring. It is a state, not
  // a control: pressing it would change nothing.
  const now = (words: string) => (
    <span className="a11y-settings-opt a11y-settings-now">
      <Ring on />
      <span className="a11y-settings-words">{words}</span>
    </span>
  );
  const pageNow = scope !== "site";
  const scopeNow = now(pageNow ? t("This page") : t("Whole site"));
  const scopeOther = (
    <button
      type="button"
      className="a11y-settings-opt a11y-settings-rerun"
      disabled={busy}
      onClick={() => onRerun({ scope: pageNow ? "site" : "page" })}
    >
      <Ring on={false} />
      <span className="a11y-settings-words">{pageNow ? t("Scan the whole site") : t("Scan this page only")}</span>
      {/* "Scan" already says it costs a scan; only the whole-site run has a
          cost worth stating, as the badge at the pill's end. The full stop
          is for a screen reader, which reads the badge as the end of the
          button's name. */}
      {pageNow && (
        <span className="a11y-settings-cost">
          <span className="a11y-sr-only">. </span>
          {t("Takes a few minutes")}
        </span>
      )}
    </button>
  );

  return (
    <section className="a11y-settings" aria-labelledby="a11y-settings-heading">
      <h3
        className="a11y-settings-heading"
        id="a11y-settings-heading"
      >
        {t("This scan")}
      </h3>

      {/* Free and instant, so it is a switch. */}
      <div className="a11y-settings-row">
        <span className="a11y-settings-label" id="a11y-settings-style">
          {t("Report style")}
        </span>
        <div className="a11y-settings-switch" role="group" aria-labelledby="a11y-settings-style">
          <button
            type="button"
            className="a11y-settings-opt"
            aria-pressed={audience === "business"}
            onClick={() => onAudienceChange("business")}
          >
            <Ring on={audience === "business"} />
            <span className="a11y-settings-words">{t("For everyone")}</span>
          </button>
          <button
            type="button"
            className="a11y-settings-opt"
            aria-pressed={audience === "professional"}
            onClick={() => onAudienceChange("professional")}
          >
            <Ring on={audience === "professional"} />
            <span className="a11y-settings-words">{t("Professional")}</span>
          </button>
        </div>
      </div>

      {/* Half free, half a scan: the report's copy switches now, the
          checklist on the next run. The helper text says which. */}
      <div className="a11y-settings-row">
        <LanguageSelect id="a11y-lang-settings" value={language} onChange={onLanguageChange} afterScan />
      </div>

      {/* Costs a scan, so the other choice states it and does not pretend
          to toggle: the setting in force is a state beside it. */}
      <div className="a11y-settings-row">
        <span className="a11y-settings-label" id="a11y-settings-ai">{t("AI review")}</span>
        <div className="a11y-settings-switch" role="group" aria-labelledby="a11y-settings-ai">
          {now(aiIncluded ? t("Included") : t("Not included"))}
          <button
            type="button"
            className="a11y-settings-opt a11y-settings-rerun"
            disabled={busy}
            onClick={() => onRerun({ ai: !aiIncluded })}
          >
            <Ring on={false} />
            <span className="a11y-settings-words">
              {aiIncluded ? t("Run again without the AI review") : t("Run again with the AI review")}
            </span>
          </button>
        </div>
      </div>

      <div className="a11y-settings-row">
        <span className="a11y-settings-label" id="a11y-settings-scope">{t("Scope")}</span>
        <div className="a11y-settings-switch" role="group" aria-labelledby="a11y-settings-scope">
          {pageNow ? scopeNow : scopeOther}
          {pageNow ? scopeOther : scopeNow}
        </div>
      </div>

      {children}
    </section>
  );
}
