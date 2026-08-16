export function HelperNote({ children, action, media, tone = "yellow", floating = false, dismissible = false, onDismiss, style }) {
  const [gone, setGone] = React.useState(false);
  const TONES = {
    yellow: { bg: "var(--yellow-30, #f1c21b)", ink: "var(--gray-100)" },
    green: { bg: "var(--green-10)", ink: "var(--green-100)" },
    blue: { bg: "var(--blue-10)", ink: "var(--blue-100)" }
  };
  const t = TONES[tone] || TONES.yellow;
  if (gone) return null;
  const showClose = dismissible || floating || !!onDismiss;
  const float = floating ? { position: "absolute", top: "var(--space-05)", right: "var(--space-05)", zIndex: 5, maxWidth: 420, boxSizing: "border-box",
    padding: "var(--space-04)", boxShadow: "var(--shadow-overlay, 0 8px 24px rgba(22,22,22,0.24))" } : null;
  return (
    <aside style={{ display: "flex", gap: "var(--space-05)", alignItems: "flex-start",
      padding: "var(--space-05)", borderRadius: "var(--radius-lg)", background: t.bg, color: t.ink,
      fontFamily: "var(--font-sans)", ...float, ...style }}>
      {media && (
        <div aria-hidden="true" style={{ flex: "0 0 auto", width: floating ? 64 : 84, height: floating ? 64 : 84, borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--gray-100)" }}>{media}</div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-04)", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: floating ? "15px" : "18px", lineHeight: 1.2, letterSpacing: "0.01em" }}>{children}</p>
        {action && (
          <span style={{ padding: "4px 14px", borderRadius: "var(--radius-pill)", border: "1px solid " + t.ink,
            fontSize: "15px", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{action}</span>
        )}
      </div>
      {showClose && (
        <button type="button" aria-label="Dismiss this note"
          onClick={() => { setGone(true); if (onDismiss) onDismiss(); }}
          style={{ flex: "0 0 auto", width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginTop: -2, border: 0, background: "transparent", cursor: "pointer", borderRadius: "var(--radius-pill)",
            color: t.ink, fontFamily: "var(--font-sans)", fontSize: "18px", lineHeight: 1 }}>
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </aside>
  );
}
