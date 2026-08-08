import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * The modal, brought across from the kit. The last component that owns
 * behaviour the platform does not supply, and the hardest to verify.
 *
 * The trap is copied line for line, including the part that is easy to get
 * wrong: `document.activeElement` stops at the shadow host once focus is
 * inside an open shadow root, so the check asks the node's own root what is
 * focused within it. Get that wrong and the trap silently never fires here,
 * because this widget always renders inside a shadow root.
 *
 * What has to hold, and what a keyboard pass has to show:
 *   Focus moves into the dialog when it opens.
 *   Tab from the last control wraps to the first.
 *   Shift+Tab from the first wraps to the last.
 *   Escape closes it.
 * A trap that leaks puts a keyboard reader behind a modal they cannot see
 * and cannot leave, which is worse than having no modal at all.
 *
 * One deliberate difference: the title's id is generated per instance
 * rather than the kit's hardcoded "dlg-title". Two dialogs on one page
 * would have collided, and aria-labelledby resolving to the wrong title is
 * a bug that only appears the day somebody adds a second modal.
 */
export function Dialog({
  open,
  title,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Cancel",
  onClose,
  danger = false,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onClose?: () => void;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);

  if (!open) return null;

  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onClose?.();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const focusable = ref.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // The node's own root, not the document: document.activeElement stops at
    // the shadow host, and this widget is always inside one.
    const active = (ref.current.getRootNode() as ShadowRoot | Document).activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="a11y-dialog-scrim" onKeyDown={trapTab}>
      <div
        className="a11y-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
      >
        <h2 className="a11y-dialog-title" id={titleId}>
          {title}
        </h2>
        <div className="a11y-dialog-body">{children}</div>
        <div className="a11y-dialog-actions">
          <button type="button" className="a11y-btn a11y-btn-secondary a11y-btn-md" onClick={onClose}>
            {secondaryLabel}
          </button>
          {primaryLabel && (
            <button
              type="button"
              className={`a11y-btn a11y-btn-${danger ? "danger" : "primary"} a11y-btn-md`}
              onClick={onPrimary}
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
