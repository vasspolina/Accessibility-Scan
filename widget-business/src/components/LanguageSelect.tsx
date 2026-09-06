import { Select } from "./Select2";
import { t } from "../lib/strings";
import { LANG_NAMES, SUPPORTED_LANGS, getLang, type Lang } from "../lib/i18n";

/**
 * The language switcher. One kit Select, offered before a scan and in the
 * run's settings after one.
 *
 * Two things change on a switch, at two speeds, and the helper text says
 * so: the report's own copy — titles, findings, fixes — switches at once,
 * because every accessor reads the language at render. The conformance
 * checklist is written by the server in the language of the request, so
 * its wording changes on the next scan. Saying that is what keeps a
 * half-German report from reading as a bug.
 */
export function LanguageSelect({
  id,
  value,
  onChange,
  afterScan = false,
}: {
  id: string;
  value: Lang;
  onChange: (lang: Lang) => void;
  afterScan?: boolean;
}) {
  return (
    <Select
      id={id}
      label={t("Language")}
      variant="line"
      value={value}
      options={SUPPORTED_LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))}
      onChange={(e) => onChange(e.target.value as Lang)}
      helperText={afterScan ? t("The checklist's wording changes on the next scan.") : undefined}
    />
  );
}

export { getLang };
