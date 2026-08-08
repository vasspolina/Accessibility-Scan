import { Fragment, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The table, brought across from the kit. The last of the fourteen, and the
 * one everything in the report sits on: findings, notes, conformance, the
 * page-by-page list, the WCAG 2.2 items.
 *
 * The DOM shape is reproduced exactly, not tidied. This package's stylesheet
 * addresses it structurally — td[colspan] for the open panel,
 * button[aria-expanded] for the toggle, tr:has(button[aria-expanded]) for
 * the card rows — so changing the shape would silently unstyle five
 * sections at once.
 *
 * What it owns that the platform does not:
 *
 *   Independent open state per row. Opening a second row does not close the
 *   first: these panels are read side by side — two findings compared, a
 *   fix checked against the one above it — and a table that closed the
 *   thing you were reading because you opened the next one took that away.
 *   The accordion behaviour it replaces is a space-saving convention, and
 *   the space it saves is the reader's to spend.
 *
 *   The toggle's accessible name changes with its state — "Expand details"
 *   / "Collapse details" — so it is never just an arrow to a screen reader.
 *
 *   The leading spacer cell in the header is a <td aria-hidden>, not a
 *   <th>. It labels nothing, and a header cell with no text announces an
 *   empty column header on every row.
 *
 * No aria-controls here, unlike the readiness panel. That one keeps its
 * list mounted and hidden so the id always resolves; this renders the panel
 * row only while open, and aria-controls pointing at an element that does
 * not exist is worse than not having it. Mounting every panel permanently
 * would put the whole report in the DOM at once, which is a real cost for
 * a table of thirty findings.
 */

export interface TableHeader {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface TableRow {
  id: string;
  cells: ReactNode[];
  expand?: ReactNode;
  /** Row tint, used by the conformance results. */
  background?: string;
}

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption?: string;
  headers: TableHeader[];
  rows: TableRow[];
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [hover, setHover] = useState<string | null>(null);
  const expandable = rows.some((r) => r.expand);

  return (
    <table className="a11y-datatable">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {/* Not a <th>: it labels nothing, and an empty header cell is
              announced as one on every row beneath it. */}
          {expandable ? <td aria-hidden="true" className="a11y-dt-spacer" /> : null}
          {headers.map((h) => (
            <th
              key={h.key}
              scope="col"
              style={{ textAlign: h.align || "left", width: h.width }}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open.has(r.id);
          const rowStyle: CSSProperties =
            r.expand && hover === r.id
              ? { background: "var(--layer-hover, #e8e8e8)" }
              : r.background
                ? { background: r.background }
                : {};
          return (
            <Fragment key={r.id}>
              <tr
                onMouseEnter={() => r.expand && setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                style={rowStyle}
              >
                {expandable ? (
                  <td className="a11y-dt-toggle-cell">
                    {r.expand ? (
                      <button
                        type="button"
                        className="a11y-dt-toggle"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} details`}
                        onClick={() =>
                          setOpen((prev) => {
                            const next = new Set(prev);
                            if (!next.delete(r.id)) next.add(r.id);
                            return next;
                          })
                        }
                      >
                        <span aria-hidden="true" data-open={isOpen}>
                          ▸
                        </span>
                      </button>
                    ) : null}
                  </td>
                ) : null}
                {r.cells.map((cell, i) => (
                  <td key={headers[i].key} style={{ textAlign: headers[i].align || "left" }}>
                    {cell}
                  </td>
                ))}
              </tr>
              {r.expand && isOpen ? (
                <tr>
                  <td colSpan={headers.length + (expandable ? 1 : 0)}>{r.expand}</td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
