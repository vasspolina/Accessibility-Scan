import { useEffect, useId, useRef, useState } from "react";
import { t } from "../lib/strings";
import { LANG_NAMES, SUPPORTED_LANGS, type Lang } from "../lib/i18n";
import { Icon } from "./Icon";

/**
 * The chat's language switcher, folded into one button at the right that
 * stays on screen while the conversation scrolls (user's instruction and
 * reference, 21 Nov 2026: "fold the language button on the right like this
 * and keep it on top on scroll", a 文A mark beside the word Language).
 *
 * A disclosure, not an ARIA menu: the button says whether it is open, and
 * the list under it is plain buttons, each saying whether it is the chosen
 * language. That pattern needs no roving focus and every reader handles
 * it. The button's name keeps the visible word first and adds the current
 * language after it ("Language, Deutsch"), so voice control still finds it
 * by what it shows. Escape, a press outside and moving focus out close it.
 *
 * The form and the report's settings keep the full Select (LanguageSelect):
 * there the language is one setting among several, set as rows.
 *
 * Since 22 Nov 2026 it is the conversations panel's last row, at the foot
 * of the column (user's instruction and reference, "add language button to
 * the bottom menu like here", an app sidebar whose foot row reads a name, a
 * dot, the plan and a chevron). The row shows the chosen language after
 * the word, so the button's name is what it shows; its list opens upward,
 * over the panel, since below it is the window's edge.
 */
export function LanguageMenu({ value, onChange }: { value: Lang; onChange: (lang: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    // The widget lives in a shadow root, so a document listener sees the
    // host as the target; the composed path still holds the real element.
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (lang: Lang) => {
    onChange(lang);
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div
      className="a11y-lang-menu"
      ref={rootRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={toggleRef}
        className="a11y-lang-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="translate" size={20} />
        <span className="a11y-lang-word">{t("Language")}</span>
        <span className="a11y-lang-current" lang={value}>
          <span aria-hidden="true">· </span>
          <span className="a11y-sr-only">, </span>
          {LANG_NAMES[value]}
        </span>
        <span className="a11y-lang-chevron">
          <Icon name="chevron--down" size={16} />
        </span>
      </button>
      <ul className="a11y-lang-list" id={listId} role="list" hidden={!open}>
        {SUPPORTED_LANGS.map((l) => (
          <li key={l}>
            <button type="button" className="a11y-lang-option" lang={l} aria-pressed={l === value} onClick={() => choose(l)}>
              {LANG_NAMES[l]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
