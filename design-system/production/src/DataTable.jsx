import React from "react";

export function DataTable({ caption, headers, rows }) {
  const [open, setOpen] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const expandable = rows.some((r) => r.expand);
  const pad = "var(--space-04) var(--space-05)";
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: "var(--type-body-size)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
      {caption ? <caption style={{ textAlign: "left", padding: "0 0 var(--space-04)", fontSize: "var(--type-label-size)", color: "var(--text-secondary)" }}>{caption}</caption> : null}
      <thead>
        <tr style={{ background: "var(--layer-01)" }}>
          {expandable ? <td aria-hidden="true" style={{ width: 48, borderBottom: "1px solid var(--border-strong)" }}></td> : null}
          {headers.map((h) => (
            <th key={h.key} scope="col" style={{ textAlign: h.align || "left", padding: pad, fontSize: "var(--type-label-size)", fontWeight: 500, borderBottom: "1px solid var(--border-strong)", width: h.width }}>{h.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open === r.id;
          const divider = isOpen ? "none" : "1px solid var(--border-subtle)";
          return (
            <React.Fragment key={r.id}>
              <tr onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} style={{ background: hover === r.id ? "var(--layer-hover)" : (r.background || "transparent") }}>
                {expandable ? (
                  <td style={{ borderBottom: divider, padding: 0, textAlign: "center" }}>
                    {r.expand ? (
                      <button type="button" aria-expanded={isOpen} aria-label={(isOpen ? "Collapse" : "Expand") + " details"} onClick={() => setOpen(isOpen ? null : r.id)}
                        style={{ width: 44, height: 44, background: "transparent", border: 0, cursor: "pointer", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "var(--type-body-size)" }}>
                        <span aria-hidden="true" style={{ display: "inline-block", transition: "transform 110ms cubic-bezier(0.2, 0, 0.38, 0.9)", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>
                      </button>
                    ) : null}
                  </td>
                ) : null}
                {r.cells.map((cell, i) => (
                  <td key={headers[i].key} style={{ textAlign: headers[i].align || "left", padding: pad, borderBottom: divider, verticalAlign: "middle", lineHeight: "var(--type-body-lh)" }}>{cell}</td>
                ))}
              </tr>
              {r.expand && isOpen ? (
                <tr>
                  <td colSpan={headers.length + (expandable ? 1 : 0)} style={{ padding: "0 var(--space-05) var(--space-05) 48px", borderBottom: "1px solid var(--border-subtle)", background: "var(--layer-01)" }}>{r.expand}</td>
                </tr>
              ) : null}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
