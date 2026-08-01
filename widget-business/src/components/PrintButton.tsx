// "Save as PDF" via the browser's own print dialog.
//
// Deliberately not a server-rendered PDF: that would mean a second Playwright
// pass per download, and the browser already produces a good PDF from styled
// HTML. This keeps the report text-selectable and searchable, costs nothing
// per export, and works offline once the report is on screen.
//
// The widget lives in a Shadow DOM, and shadow styles cannot reach light-DOM
// elements — so the rule that hides the surrounding host page has to be
// injected into the document head. The widget's own print styling stays in
// styles.css where it belongs.

const HOST_PRINT_STYLE_ID = "a11y-widget-host-print-style";

// Hides everything on the embedding page except the widget's mount point, so a
// print of the report doesn't drag along the host site's header, nav and
// footer. Scoped to @media print, so it never affects normal viewing.
const HOST_PRINT_CSS = `
@media print {
  body > *:not(#a11y-widget-business-root) { display: none !important; }
  #a11y-widget-business-root { display: block !important; }
  @page { margin: 14mm; }
}
`;

function ensureHostPrintStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(HOST_PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HOST_PRINT_STYLE_ID;
  style.textContent = HOST_PRINT_CSS;
  document.head.appendChild(style);
}

export function PrintButton({
  label = "Save as PDF",
  compact = false,
}: {
  label?: string;
  /* The professional action row wants the master file's bare button; the
     business report keeps the sentence explaining what the dialog is. */
  compact?: boolean;
}) {
  const button = (
    <button
      type="button"
      className="a11y-sr-play"
      onClick={() => {
        ensureHostPrintStyle();
        window.print();
      }}
    >
      {label}
    </button>
  );
  if (compact) return button;
  return (
    <div className="a11y-print-row">
      {button}
      <span className="a11y-sr-status">
        Opens your browser's print dialog. Choose &ldquo;Save as PDF&rdquo; as the destination.
      </span>
    </div>
  );
}
