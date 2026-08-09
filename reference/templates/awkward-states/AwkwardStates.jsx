/* scoped */
(function(){
const __dsLazyAwk = (n) => { const C = (props) => React.createElement((window.AccessibleScanDesignSystem_64839a || {})[n] || "div", props); C.displayName = n; return C; };
const Button = __dsLazyAwk("Button"), HelperNote = __dsLazyAwk("HelperNote"), SeverityTag = __dsLazyAwk("SeverityTag"), Tag = __dsLazyAwk("Tag");

const AWK_DENSE = [
  { sev: "critical", n: 1284, title: "Form elements do not have associated labels", crit: "WCAG 4.1.2 Name, Role, Value (Level A)",
    sel: "form#checkout-billing-address fieldset > div.field-row input[type=\"text\"]:not([aria-label])",
    where: "/checkout/billing, /checkout/shipping, /account/addresses/edit and 41 more pages" },
  { sev: "critical", n: 906, title: "Background and foreground colours do not have a sufficient contrast ratio", crit: "WCAG 1.4.3 Contrast (Minimum) (Level AA)",
    sel: ".product-grid .product-card__meta .price--was, .breadcrumbs a, footer .legal-links a",
    where: "Every page in /shop and /collections — 312 pages" },
  { sev: "serious", n: 47, title: "Interactive controls are nested inside other interactive controls", crit: "WCAG 4.1.2 Name, Role, Value (Level A)",
    sel: "a.product-card > button.product-card__wishlist-toggle",
    where: "/shop, /collections/new-in, /collections/sale" },
  { sev: "serious", n: 12, title: "Frame does not have a title attribute or accessible name", crit: "WCAG 4.1.2 Name, Role, Value (Level A)",
    sel: "iframe[src^=\"https://player.vimeo.com/video/\"]", where: "/about/our-makers, /journal/behind-the-seams" },
  { sev: "moderate", n: 8, title: "Heading levels skip from h1 straight to h4 inside the article body", crit: "WCAG 1.3.1 Info and Relationships (Level A)",
    sel: "article.journal-entry h4", where: "8 journal entries published between March and July" },
  { sev: "minor", n: 3, title: "Link text is not descriptive when read out of context", crit: "WCAG 2.4.4 Link Purpose (In Context) (Level A)",
    sel: "footer a", where: "Every page — \u201cread more\u201d, \u201cclick here\u201d, \u201clearn more\u201d" }
];

function AwkSection({ n, title, note, children }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-05)" }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: "var(--space-04)", paddingBottom: "var(--space-04)", borderBottom: "1px solid var(--text-primary)" }}>
        <span aria-hidden="true" style={{ fontSize: "15px", color: "var(--text-secondary)", letterSpacing: "0.01em" }}>{n}</span>
        <h2 style={{ margin: 0, flex: 1, fontSize: "28px", lineHeight: 1.05, fontWeight: 500, letterSpacing: "0.01em" }}>{title}</h2>
        <span style={{ fontSize: "15px", color: "var(--text-secondary)", letterSpacing: "0.01em", maxWidth: "42ch", textAlign: "right" }}>{note}</span>
      </header>
      {children}
    </section>
  );
}

function AwkEmpty() {
  return (
    <div style={{ background: "var(--layer-01)", borderRadius: "var(--radius-lg)", padding: "var(--space-09) var(--space-07)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-05)", textAlign: "center" }}>
      <span style={{ fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>0 issues on 0 pages</span>
      <h3 style={{ margin: 0, maxWidth: "24ch", fontSize: "40px", lineHeight: 1.05, fontWeight: 500, letterSpacing: "0.01em" }}>
        We could not reach a single page on stedelijk.nl
      </h3>
      <p style={{ margin: 0, maxWidth: "62ch", fontSize: "18px", lineHeight: 1.5, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>
        The crawler was refused at the front door: robots.txt disallows every path under /, and the four URLs you listed in the
        sitemap field returned 401. Nothing was scanned, so there is nothing to report — this is not a score of zero.
      </p>
      <div style={{ display: "flex", gap: "var(--space-04)", flexWrap: "wrap", justifyContent: "center", marginTop: "var(--space-03)" }}>
        <Button>Scan a single page instead</Button>
        <Button variant="secondary">Add sign-in details</Button>
      </div>
    </div>
  );
}

function AwkError() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-05)" }}>
      <div style={{ background: "var(--red-10)", border: "2px solid var(--red-60)", borderRadius: "var(--radius-lg)", padding: "var(--space-06)",
        display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-04)", flexWrap: "wrap" }}>
          <SeverityTag severity="critical" label="Scan stopped" />
          <span style={{ fontSize: "15px", letterSpacing: "0.01em", color: "var(--red-70)" }}>Stopped after 6 minutes 12 seconds · 214 of 1,038 pages</span>
        </div>
        <h3 style={{ margin: 0, maxWidth: "46ch", fontSize: "28px", lineHeight: 1.1, fontWeight: 500, letterSpacing: "0.01em", color: "var(--red-100)" }}>
          shop.example.com started returning 429 Too Many Requests
        </h3>
        <p style={{ margin: 0, maxWidth: "70ch", fontSize: "18px", lineHeight: 1.5, letterSpacing: "0.01em", color: "var(--red-100)" }}>
          The server asked us to slow down and we stopped rather than keep hammering it. The 214 pages we did read are saved and
          shown below, so the findings are real but incomplete — treat the counts as a floor, not a total.
        </p>
        <div style={{ display: "flex", gap: "var(--space-04)", flexWrap: "wrap" }}>
          <Button variant="danger">Resume at page 215</Button>
          <Button variant="secondary">Slow the crawl to 1 page a second</Button>
          <Button variant="ghost">Keep the partial report</Button>
        </div>
      </div>
      <HelperNote action="What a partial scan can and cannot tell you">
        A stopped scan is still evidence. It is not a clean bill of health for the 824 pages we never opened.
      </HelperNote>
    </div>
  );
}

function AwkDenseRow({ r }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px 120px", gap: "var(--space-05)", alignItems: "start",
      padding: "var(--space-05) 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-02)" }}>
        <span style={{ fontSize: "20px", lineHeight: 1.2, fontWeight: 500, letterSpacing: "0.01em", textWrap: "pretty" }}>{r.title}</span>
        <span style={{ fontSize: "15px", lineHeight: 1.4, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>{r.crit}</span>
        <code style={{ display: "block", maxWidth: "100%", overflowWrap: "anywhere", fontFamily: "inherit", fontSize: "15px", lineHeight: 1.4,
          letterSpacing: "0.01em", color: "var(--text-primary)", background: "var(--layer-01)", borderRadius: "var(--radius-sm)", padding: "2px 6px" }}>{r.sel}</code>
        <span style={{ fontSize: "15px", lineHeight: 1.4, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>{r.where}</span>
      </div>
      <div style={{ justifySelf: "start" }}><SeverityTag severity={r.sev} /></div>
      <span style={{ justifySelf: "end", textAlign: "right", fontSize: "40px", lineHeight: 1, fontWeight: 500, letterSpacing: "0.01em",
        fontVariantNumeric: "tabular-nums" }}>{r.n.toLocaleString("en-GB")}</span>
    </div>
  );
}

function AwkDense() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px 120px", gap: "var(--space-05)",
        paddingBottom: "var(--space-03)", borderBottom: "1px solid var(--text-primary)",
        fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>
        <span>Finding, criterion, selector, where</span><span>Severity</span><span style={{ justifySelf: "end" }}>Instances</span>
      </div>
      {AWK_DENSE.map((r) => <AwkDenseRow key={r.title} r={r} />)}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-05)", paddingTop: "var(--space-05)", flexWrap: "wrap" }}>
        <span style={{ fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>
          2,260 instances across 6 findings. Two findings account for 96% of them.
        </span>
        <Button variant="secondary">Group by page instead</Button>
      </div>
    </div>
  );
}

function AwkMobile() {
  const r = AWK_DENSE[0];
  return (
    <div style={{ display: "flex", gap: "var(--space-06)", flexWrap: "wrap" }}>
      <div style={{ width: 390, flexShrink: 0, background: "var(--background)", border: "1px solid var(--text-primary)",
        borderRadius: "var(--radius-lg)", padding: "var(--space-05)", display: "flex", flexDirection: "column", gap: "var(--space-05)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-02)" }}>
          <span style={{ fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>214 of 1,038 pages read</span>
          <h3 style={{ margin: 0, fontSize: "28px", lineHeight: 1.05, fontWeight: 500, letterSpacing: "0.01em", overflowWrap: "anywhere" }}>shop.example.com</h3>
        </div>
        <div style={{ display: "flex", gap: "var(--space-03)", flexWrap: "wrap" }}>
          <Tag tone="red">Stopped</Tag><Tag tone="blue">WCAG 2.2 AA</Tag><Tag tone="teal">2,260 instances</Tag>
        </div>
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-05)", display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-04)" }}>
            <SeverityTag severity={r.sev} />
            <span style={{ fontSize: "40px", lineHeight: 1, fontWeight: 500, letterSpacing: "0.01em", fontVariantNumeric: "tabular-nums" }}>1,284</span>
          </div>
          <span style={{ fontSize: "20px", lineHeight: 1.2, fontWeight: 500, letterSpacing: "0.01em", textWrap: "pretty" }}>{r.title}</span>
          <span style={{ fontSize: "15px", lineHeight: 1.4, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>{r.crit}</span>
          <code style={{ fontFamily: "inherit", fontSize: "15px", lineHeight: 1.4, letterSpacing: "0.01em", overflowWrap: "anywhere",
            background: "var(--layer-01)", borderRadius: "var(--radius-sm)", padding: "6px 8px" }}>{r.sel}</code>
          <Button style={{ width: "100%" }}>View fix</Button>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: "var(--space-04)", paddingTop: "var(--space-04)" }}>
        <p style={{ margin: 0, maxWidth: "58ch", fontSize: "18px", lineHeight: 1.5, letterSpacing: "0.01em" }}>
          At 390px the three-column row becomes a stack and the instance count moves up beside the severity pill, where it stays
          on one line. The selector keeps <code style={{ fontFamily: "inherit" }}>overflow-wrap: anywhere</code> so a 78-character
          CSS path breaks inside the card instead of widening it.
        </p>
        <p style={{ margin: 0, maxWidth: "58ch", fontSize: "18px", lineHeight: 1.5, letterSpacing: "0.01em", color: "var(--text-secondary)" }}>
          The action goes full width — 48px tall, above the 44px minimum — and the three tags wrap to two lines rather than
          scrolling sideways.
        </p>
      </div>
    </div>
  );
}

function AwkwardStates() {
  return (
    <main id="main" style={{ minHeight: "100vh", boxSizing: "border-box", background: "var(--background)", color: "var(--text-primary)",
      padding: "var(--space-07) var(--space-06) var(--space-09)", fontFamily: '"PP Telegraf", sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-09)" }}>
        <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-04)" }}>
          <span style={{ fontSize: "15px", letterSpacing: "0.01em", color: "var(--text-secondary)" }}>Four states the happy path does not cover</span>
          <h1 style={{ margin: 0, fontSize: "40px", lineHeight: 1.05, fontWeight: 500, letterSpacing: "0.01em" }}>Awkward states</h1>
        </header>
        <AwkSection n="01" title="Nothing to show" note="Zero is not a score. The screen has to say why it is empty.">
          <AwkEmpty />
        </AwkSection>
        <AwkSection n="02" title="Stopped part-way" note="A failure that still produced usable data, and must not read as a pass.">
          <AwkError />
        </AwkSection>
        <AwkSection n="03" title="Dense findings" note="Real selectors and four-figure counts, not “Issue 1 · 3 instances”.">
          <AwkDense />
        </AwkSection>
        <AwkSection n="04" title="390px reflow" note="The same row, stacked, with nothing truncated.">
          <AwkMobile />
        </AwkSection>
      </div>
    </main>
  );
}

window.AwkwardStates = AwkwardStates;
const __awkMount = document.querySelector('#root[data-screen="AwkwardStates"]');
if (__awkMount) (__awkMount.__root || (__awkMount.__root = ReactDOM.createRoot(__awkMount))).render(<AwkwardStates />);

})();
