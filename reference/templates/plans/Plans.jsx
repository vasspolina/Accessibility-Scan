/* scoped */
(function(){
const __dsLazy = (n) => { const C = (props) => React.createElement((window.AccessibleScanDesignSystem_64839a || {})[n] || "div", props); C.displayName = n; return C; };
const Button = __dsLazy("Button"), HelperNote = __dsLazy("HelperNote");

const PLANS = [
  { id: "check", name: "Single check", price: "Free", cadence: "one page, any time",
    summary: "One page, scanned end to end. Enough to see where you stand.",
    features: ["1 page per scan", "WCAG 2.2 A and AA", "Plain-language findings", "Fix guides for every finding", "Shareable report link", "No account needed"] },
  { id: "site", name: "Whole site", price: "$29", cadence: "/ month", tag: "Most chosen", accent: true,
    summary: "Every page we can reach, re-scanned monthly, with what repeats called out.",
    features: ["Up to 250 pages", "Monthly re-scan and drift alerts", "AI design and copy review", "Designer / developer handoff", "Accessibility statement builder", "Export to PDF and CSV"] },
  { id: "team", name: "Team", price: "$79", cadence: "/ month",
    summary: "Several sites, several people, and the evidence trail a legal review asks for.",
    features: ["Unlimited pages, 10 sites", "Weekly re-scans", "Scan pages behind a login", "Audit history and comparisons", "5 seats with roles", "Priority support"] }
];

function Plan({ p }) {
  const on = p.accent;
  return (
    <article style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-05)",
      padding: "var(--space-07) var(--space-06)", borderRadius: "var(--radius-lg)",
      background: on ? "var(--green-10)" : "var(--layer-01)", color: on ? "var(--green-100)" : "var(--text-primary)",
      border: "2px solid " + (on ? "var(--green-60)" : "transparent") }}>
      {p.tag && (
        <span style={{ position: "absolute", top: -14, right: "var(--space-06)", background: "var(--green-60)", color: "var(--white)",
          borderRadius: "var(--radius-pill)", padding: "4px 14px", fontSize: "15px", fontWeight: 500, letterSpacing: "0.01em" }}>{p.tag}</span>
      )}
      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 500, letterSpacing: "0.01em" }}>{p.name}</h2>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-03)" }}>
        <span style={{ font: "500 clamp(48px,7vw,96px)/0.9 PP Telegraf, sans-serif", letterSpacing: "0.01em",
          color: on ? "var(--green-60)" : "var(--text-primary)" }}>{p.price}</span>
        <span style={{ fontSize: "15px", color: on ? "var(--green-70)" : "var(--text-secondary)" }}>{p.cadence}</span>
      </div>
      <p style={{ margin: 0, fontSize: "18px", lineHeight: 1.4, fontWeight: 500 }}>{p.summary}</p>
      <hr style={{ margin: 0, border: 0, borderTop: "1px solid " + (on ? "var(--green-60)" : "var(--border-subtle)") }} />
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-03)", fontSize: "18px" }}>
        {p.features.map((f, i) => (
          <li key={f} style={{ display: "flex", gap: "var(--space-03)", alignItems: "baseline", fontWeight: i < 2 ? 500 : 400 }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%",
              background: on ? "var(--green-60)" : "var(--gray-40)" }} />
            <span style={{ color: on ? "var(--green-100)" : "var(--text-primary)" }}>{f}</span>
          </li>
        ))}
      </ul>
      <div style={{ flex: 1 }} />
      <Button variant={on ? "primary" : "secondary"} style={{ width: "100%" }}>
        {p.price === "Free" ? "Run a check" : "Get this plan"}
      </Button>
    </article>
  );
}

function Plans() {
  return (
    <main id="main" style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--space-09) var(--space-06)",
      display: "flex", flexDirection: "column", gap: "var(--space-08)",
      fontFamily: '"PP Telegraf", sans-serif', color: "var(--text-primary)" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
        <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Plans</span>
        <h1 style={{ margin: 0, font: "500 clamp(48px,7vw,96px)/0.95 PP Telegraf, sans-serif", letterSpacing: "0.01em" }}>
          Scan once, or keep it fixed
        </h1>
        <p style={{ margin: 0, maxWidth: "62ch", fontSize: "18px", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          Every plan reports against WCAG 2.2 and explains findings in plain language. The difference is how much of your
          site we watch, and how often.
        </p>
      </header>
      <HelperNote action="How the scan works" style={{ maxWidth: "72ch" }}>
        Every plan reads the same way: what is broken, who fixes it, and what it costs a visitor. Start free — you can
        move a report onto a paid plan later without re-scanning.
      </HelperNote>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-06)", alignItems: "stretch" }}>
        {PLANS.map((p) => <Plan key={p.id} p={p} />)}
      </div>
      <p style={{ margin: 0, fontSize: "15px", color: "var(--text-secondary)" }}>
        Prices exclude VAT. Cancel any time — reports you have already run stay available.
      </p>
    </main>
  );
}

window.Plans = Plans;
const __mount = document.querySelector('#root[data-screen="Plans"]');
if (__mount) (__mount.__root || (__mount.__root = ReactDOM.createRoot(__mount))).render(<Plans />);

})();
