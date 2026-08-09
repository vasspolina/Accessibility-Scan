/* scoped */
(function(){
const __dsLazyDash = (n) => { const C = (props) => React.createElement((window.AccessibleScanDesignSystem_64839a || {})[n] || "div", props); C.displayName = n; return C; };
const HelperNote = __dsLazyDash("HelperNote"), Tag = __dsLazyDash("Tag"), Button = __dsLazyDash("Button");

const DASH_SITES = [
  { site: "example.com", score: 6, pages: 8, issues: 60, ribbon: "Failing", tone: "red" },
  { site: "shop.example.com", score: 61, pages: 34, issues: 41, ribbon: "New scan", tone: "yellow" },
  { site: "docs.example.com", score: 94, pages: 120, issues: 3, ribbon: "Good", tone: "green" },
  { site: "careers.example.com", score: 72, pages: 12, issues: 18 },
  { site: "help.example.com", score: 88, pages: 61, issues: 9, ribbon: "Improved", tone: "yellow" },
  { site: "status.example.com", score: 97, pages: 4, issues: 1 },
  { site: "blog.example.com", score: 44, pages: 210, issues: 132, ribbon: "Failing", tone: "red" },
  { site: "events.example.com", score: 79, pages: 16, issues: 22 }
];

const DASH_TAG_TONE = { red: "red", yellow: "gray", green: "green" };
const DASH_RIBBON = {
  red: { bg: "var(--red-60)", ink: "var(--white)" },
  yellow: { bg: "#f1c21b", ink: "var(--gray-100)" },
  green: { bg: "var(--green-60)", ink: "var(--white)" }
};

function DashSiteRow({ s }) {
  const [hot, setHot] = React.useState(false);
  const r = s.ribbon ? DASH_RIBBON[s.tone] : null;
  return (
    <button type="button" onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={() => setHot(false)}
      style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "var(--space-05)", width: "100%", padding: "var(--space-05) var(--space-06)", border: 0, cursor: "pointer",
        borderRadius: "var(--radius-pill)", background: hot ? "var(--gray-100)" : "var(--white)",
        color: hot ? "var(--white)" : "var(--gray-100)", textAlign: "left",
        transition: "background var(--duration-quick) var(--ease-standard)", fontFamily: '"PP Telegraf", sans-serif' }}>
      <span style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "0.01em", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.site}</span>
      <span style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "var(--space-04)" }}>
        {s.ribbon && <Tag tone={DASH_TAG_TONE[s.tone]}>{s.ribbon}</Tag>}
        <span style={{ textAlign: "right", fontFamily: '"PP Telegraf", sans-serif',
          fontSize: "15px", lineHeight: 1.35, whiteSpace: "nowrap", color: hot ? "var(--white)" : "var(--gray-70)" }}>
          {s.score} / 100<br />{s.pages} pages<br />{s.issues} {s.issues === 1 ? "issue" : "issues"}
        </span>
      </span>
    </button>
  );
}

function Dashboard() {
  const [q, setQ] = React.useState("");
  const list = DASH_SITES.filter((s) => s.site.includes(q.toLowerCase()));
  React.useEffect(() => {
    const el = document.createElement("style");
    el.textContent = ".dash-filter::placeholder{color:rgba(255,255,255,0.78)}";
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return (
    <main id="main" style={{ minHeight: "100vh", boxSizing: "border-box", padding: "var(--space-06)",
      background: "var(--green-50, #24a148)", fontFamily: '"PP Telegraf", sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-05)" }}>
        <label htmlFor="q" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Filter sites</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="FILTER SITES…"
          style={{ width: "100%", height: 64, boxSizing: "border-box", padding: "0 var(--space-06)", borderRadius: "var(--radius-pill)",
            border: 0, background: "rgba(255,255,255,0.16)", color: "var(--white)", textAlign: "center",
            fontFamily: "inherit", fontSize: "24px", fontWeight: 500, letterSpacing: "0.01em" }} className="dash-filter" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-04)" }}>
          {list.slice(0, 6).map((s) => <DashSiteRow key={s.site} s={s} />)}
        </div>

        <HelperNote action="Learn more" style={{ alignSelf: "center", maxWidth: 620 }}>
          A scan proves about a third of what matters. The rest needs a person.
        </HelperNote>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-04)" }}>
          {list.slice(6).map((s) => <DashSiteRow key={s.site} s={s} />)}
        </div>
      </div>
      <div style={{ marginTop: "var(--space-06)", display: "flex", justifyContent: "center",
        gap: "var(--space-03)", flexWrap: "wrap" }}>
        {[["Filter sites", false], ["Switch view (1/3)", false], ["New scan", true]].map(([label, solid]) => (
          <Button key={label} variant={solid ? "primary" : "secondary"}
            style={solid ? { background: "var(--gray-100)", borderColor: "var(--gray-100)" } : { background: "var(--white)", color: "var(--gray-100)", borderColor: "var(--white)" }}>{label}</Button>
        ))}
      </div>
    </main>
  );
}

window.Dashboard = Dashboard;
const __dashMount = document.querySelector('#root[data-screen="Dashboard"]');
if (__dashMount) (__dashMount.__root || (__dashMount.__root = ReactDOM.createRoot(__dashMount))).render(<Dashboard />);

})();
