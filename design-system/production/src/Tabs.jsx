import React from "react";
export function Tabs({ items = [], defaultId, onChange, style }) {
  const [active, setActive] = React.useState(defaultId || (items[0] && items[0].id));
  const refs = React.useRef({});
  const go = (id) => { setActive(id); onChange && onChange(id); };
  const onKey = (e, i) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = items[(i + d + items.length) % items.length];
    go(n.id); refs.current[n.id] && refs.current[n.id].focus();
  };
  const cur = items.find((it) => it.id === active);
  return (
    <div style={{ fontFamily: "var(--font-sans)", ...style }}>
      <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
        {items.map((it, i) => (
          <button key={it.id} role="tab" id={"tab-" + it.id} aria-selected={it.id === active}
            aria-controls={"panel-" + it.id} tabIndex={it.id === active ? 0 : -1}
            ref={(el) => (refs.current[it.id] = el)} onClick={() => go(it.id)} onKeyDown={(e) => onKey(e, i)}
            style={{ height: 40, padding: "0 var(--space-05)", background: "transparent", border: 0, cursor: "pointer",
              fontFamily: "inherit", fontSize: "var(--type-body-size)", fontWeight: it.id === active ? 500 : 400,
              color: it.id === active ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: it.id === active ? "2px solid var(--interactive)" : "2px solid transparent", marginBottom: -1 }}>
            {it.label}
          </button>
        ))}
      </div>
      {cur && <div role="tabpanel" id={"panel-" + cur.id} aria-labelledby={"tab-" + cur.id} tabIndex={0}
        style={{ padding: "var(--space-05) 0", color: "var(--text-primary)", fontSize: "var(--type-body-size)" }}>{cur.panel}</div>}
    </div>
  );
}
