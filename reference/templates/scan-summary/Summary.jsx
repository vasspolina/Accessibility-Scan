/* scoped */
(function(){
const __dsLazy = (n) => { const C = (props) => React.createElement((window.AccessibleScanDesignSystem_64839a || {})[n] || "div", props); C.displayName = n; return C; };
const Button = __dsLazy("Button"), HelperNote = __dsLazy("HelperNote"), ScoreDial = __dsLazy("ScoreDial"), IssueRow = __dsLazy("IssueRow");

const FIXES = [
  { severity: "critical", label: "Fix first", title: "Control parts separated from their control", criterion: "WCAG 1.3.1", count: 6 },
  { severity: "serious", label: "Fix soon", title: "Text too faint to read", criterion: "WCAG 1.4.3", count: 10 },
  { severity: "serious", label: "Fix soon", title: "Tab order contradicts the visible order", criterion: "WCAG 2.4.3", count: 5 }
];

const COUNTS = [
  "It counts what an automated scan can prove, weighted by how much each problem costs a visitor.",
  "A scan of this kind reaches somewhere between a third and a half of accessibility problems.",
  "The rest need a person with a keyboard and a screen reader.",
  "It is useful for tracking whether the site improves over time.",
  "It is not a statement that the site meets the law."
];

function Summary() {
  return (
    <main id="main" style={{ maxWidth: 1040, margin: "0 auto", padding: "var(--space-09) var(--space-06)",
      display: "flex", flexDirection: "column", gap: "var(--space-08)",
      fontFamily: '"PP Telegraf", sans-serif', color: "var(--text-primary)" }}>
      <p style={{ margin: 0, fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>
        Check complete in 21 seconds. Score 6 out of 100, 60 issues found. The full report follows.
      </p>

      <section style={{ position: "relative", padding: "var(--space-06)", paddingRight: 460, borderRadius: "var(--radius-lg)", background: "var(--gray-100)", color: "var(--text-on-invert)",
        display: "flex", flexDirection: "column", gap: "var(--space-03)" }}>
        <HelperNote floating action="Book a manual review">
          A scan proves what a machine can see. The rest needs someone to sit down with the site.
        </HelperNote>
        <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-03)" }}>
          <span style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "0.01em", color: "var(--text-on-invert-tertiary)" }}>Do this first</span>
          <h2 style={{ margin: 0, maxWidth: "60ch", fontSize: "20px", lineHeight: 1.25, fontWeight: 500, letterSpacing: "0.01em" }}>
            Fixing <strong style={{ fontWeight: 500, color: "var(--orange-40)" }}>text too faint to read</strong> settles 10 of the 25 most serious findings at once.
          </h2>
        </header>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)", gap: "var(--space-07)", alignItems: "start" }}>
        <ScoreDial score={6} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
          {FIXES.map((f) => (
            <IssueRow key={f.title} severity={f.severity} title={f.title} criterion={f.criterion} count={f.count} />
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-06)", alignItems: "start" }}>
        <div style={{ padding: "var(--space-06)", borderRadius: "var(--radius-lg)", background: "var(--red-10)", color: "var(--red-100)" }}>
          <p style={{ margin: 0, fontSize: "20px", lineHeight: 1.3, fontWeight: 500 }}>
            The door is locked. Nobody remembers who chose the lock.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 500, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>What the score counts</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-03)", fontSize: "18px", lineHeight: 1.45 }}>
            {COUNTS.map((c, i) => (
              <li key={c} style={{ display: "flex", gap: "var(--space-04)", alignItems: "baseline" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: "1.5rem", fontSize: "15px", fontWeight: 500, color: "var(--text-secondary)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div style={{ display: "flex", gap: "var(--space-04)", flexWrap: "wrap" }}>
        <Button variant="secondary">Copy summary as plain text</Button>
        <Button variant="secondary">Save as PDF</Button>
      </div>
    </main>
  );
}

window.Summary = Summary;
const __mount = document.querySelector('#root[data-screen="Summary"]');
if (__mount) (__mount.__root || (__mount.__root = ReactDOM.createRoot(__mount))).render(<Summary />);

})();
