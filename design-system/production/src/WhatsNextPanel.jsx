import React from "react";

/**
 * A forward-looking readiness summary: which standard is coming, when, how
 * many items already fail today, and the short list of what changes.
 * Deliberately quieter than SeverityTag/Notification — nothing it reports
 * is a requirement yet, so it never uses the error/warning colour roles,
 * only a neutral badge for the "already fails" count.
 */
export function WhatsNextPanel({ standard, expected, failCount, description, items = [], style }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: "var(--layer-01)",
        padding: "var(--space-05)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-04)", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "var(--type-body-size)", fontWeight: 500 }}>{standard}</div>
          {expected && (
            <div style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)", marginTop: "var(--space-02)" }}>
              {expected}
            </div>
          )}
        </div>
        {failCount > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              whiteSpace: "nowrap",
              padding: "0 var(--space-03)",
              borderRadius: "var(--radius-pill)",
              background: "var(--layer-02)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              fontSize: "var(--type-label-size)",
              fontWeight: 500,
            }}
          >
            {failCount} {failCount === 1 ? "already fails" : "already fail"}
          </span>
        )}
      </div>

      {description && (
        <p style={{ fontSize: "var(--type-body-size)", color: "var(--text-secondary)", margin: "var(--space-04) 0" }}>
          {description}
        </p>
      )}

      {items.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-03)" }}>
          {items.map((it) => (
            <li
              key={it.criterion}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--space-04)",
                paddingTop: "var(--space-03)",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "var(--type-body-size)",
              }}
            >
              <span style={{ fontWeight: 500, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{it.criterion}</span>
              <span style={{ flex: 1 }}>{it.title}</span>
              <span style={{ fontSize: "var(--type-label-size)", color: "var(--text-secondary)", flexShrink: 0 }}>{it.level}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
