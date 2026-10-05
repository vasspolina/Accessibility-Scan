import React from "react";

/**
 * Statement generator card: organisation/email fields, the declared-values
 * table (field, value, and an optional plain-language caption under the
 * value), the copy action, and the statement text itself. Vendored from
 * the claude.ai/design project (added upstream 4 Aug).
 */
export function AccessibilityStatementBuilder({ title = "Your accessibility statement", intro, orgLabel = "Organisation name", orgPlaceholder = "Acme Ltd", org, onOrgChange, emailLabel = "Contact email for accessibility issues", emailPlaceholder = "access@example.com", email, onEmailChange, fields = [], position = "Partially conformant", failedCount = 0, statement, style }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (statement && navigator.clipboard) navigator.clipboard.writeText(statement).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section style={{ background: "var(--layer-01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-sans)", color: "var(--text-primary)", overflow: "hidden", ...style }}>
      <div style={{ padding: "var(--space-06) var(--space-06) var(--space-05)", borderBottom: "1px solid var(--border-subtle)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--type-heading-size)", lineHeight: "var(--type-heading-lh)", fontWeight: 500 }}>{title}</h2>
      </div>
      <div style={{ padding: "var(--space-06)", display: "flex", flexDirection: "column", gap: "var(--space-06)" }}>
        {intro && <p style={{ margin: 0, fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)", color: "var(--text-secondary)" }}>{intro}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-06)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-03)" }}>
            <label htmlFor="asb-org" style={{ fontSize: "var(--type-body-size)", fontWeight: 500 }}>{orgLabel}</label>
            <input id="asb-org" placeholder={orgPlaceholder} {...(onOrgChange ? { value: org, onChange: onOrgChange } : { defaultValue: org })}
              style={{ height: 44, padding: "0 var(--space-05)", background: "var(--field)", color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "var(--type-body-size)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-03)" }}>
            <label htmlFor="asb-email" style={{ fontSize: "var(--type-body-size)", fontWeight: 500 }}>{emailLabel}</label>
            <input id="asb-email" type="email" placeholder={emailPlaceholder} {...(onEmailChange ? { value: email, onChange: onEmailChange } : { defaultValue: email })}
              style={{ height: 44, padding: "0 var(--space-05)", background: "var(--field)", color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "var(--type-body-size)" }} />
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--type-body-size)" }}>
          <caption style={{ textAlign: "left", fontSize: "var(--type-label-size)", fontWeight: 500, color: "var(--text-primary)",
            padding: "0 0 var(--space-04)", borderBottom: "1px solid var(--border-strong)" }}>What this statement says</caption>
          <tbody>
            {fields.map((f, i) => (
              <tr key={i} style={{ borderBottom: i < fields.length - 1 ? "1px solid var(--border-subtle)" : 0 }}>
                <th scope="row" style={{ textAlign: "left", verticalAlign: "top", padding: "var(--space-05) var(--space-06) var(--space-05) 0",
                  fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{f.field}</th>
                <td style={{ padding: "var(--space-05) 0" }}>
                  <div style={{ color: "var(--text-primary)" }}>{f.value}</div>
                  {f.caption && <div style={{ marginTop: "var(--space-02)", color: "var(--text-secondary)" }}>{f.caption}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-05)", flexWrap: "wrap" }}>
          <button type="button" onClick={copy}
            style={{ height: 44, padding: "0 var(--space-05)", whiteSpace: "nowrap", background: "var(--button-primary)", color: "var(--text-on-color)",
              border: 0, borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "var(--type-body-size)", fontWeight: 500, cursor: "pointer" }}>
            {copied ? "Copied" : "Copy the statement"}
          </button>
          <span style={{ fontSize: "var(--type-body-size)", color: "var(--text-secondary)" }}>
            Says <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{position.toLowerCase()}</strong>, based on {failedCount} failed criteria.
          </span>
        </div>
        {statement && (
          <pre style={{ margin: 0, padding: "var(--space-05)", background: "var(--field)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "var(--type-body-size)", lineHeight: "var(--type-body-lh)",
            color: "var(--text-primary)", whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 260 }}>{statement}</pre>
        )}
      </div>
    </section>
  );
}
