import { Fragment, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The results table, ported from components/display/DataTable.jsx.
 *
 * The most-used component in this package — eight callers — and the one with
 * the most behaviour worth not losing, so the port keeps this package's
 * shape and takes the source's look.
 *
 * The CSS relies on this markup: td[colspan] for the open panel,
 * button[aria-expanded] for the toggle, tr:has(button[aria-expanded]) for the
 * card rows. Changing the structure silently unstyles five sections at once.
 *
 * What it owns that the platform does not:
 *
 *   Independent open state per row. The SOURCE closes the previous row when
 *   a second opens (`setOpen(isOpen ? null : r.id)`); this does not, because
 *   you asked for exactly that and the reason holds — these panels get read
 *   side by side, two findings compared, a fix checked against the one
 *   above. A table that closed the thing you were reading because you opened
 *   the next one took that away. Accordion behaviour is a space-saving
 *   convention, and the space it saves is the reader's to spend.
 *
 *   The toggle's accessible name changes with its state — "Expand details" /
 *   "Collapse details" — so it is never just an arrow to a screen reader.
 *
 *   The leading spacer cell in the header is a <td aria-hidden>, not a <th>.
 *   It labels nothing, and a header cell with no text announces an empty
 *   column header on every row beneath it. The source does the same.
 *
 * No aria-controls, deliberately: this renders the panel row only while
 * open, and aria-controls pointing at an element that does not exist is
 * worse than not having it. Mounting every panel permanently would put the
 * whole report in the DOM at once, a real cost for thirty findings.
 *
 * DataTable.css is not imported here; see src/styles/components.css.
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

/**
 * The filter pills, from the source's own FilterPills.
 *
 * aria-pressed rather than a radiogroup: the source uses it, and for a strip
 * of toggles where one is on it reads correctly as "pressed". A radiogroup
 * would be defensible too, but it would need arrow-key roving focus to be
 * correct, and half a radiogroup is worse than a row of honest buttons.
 */
function FilterPills({
  filters,
  value,
  onChange,
}: {
  filters: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="a11y-datatable-filters">
      {filters.map((f) => (
        <button
          key={f}
          type="button"
          className="a11y-datatable-filter"
          aria-pressed={(value ?? filters[0]) === f}
          onClick={() => onChange?.(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export function DataTable({
  caption,
  headers,
  rows,
  filters,
  filter,
  onFilterChange,
  framed = false,
}: {
  caption?: string;
  headers: TableHeader[];
  rows: TableRow[];
  /** Renders a pill row above the table, inside the frame. */
  filters?: string[];
  filter?: string;
  onFilterChange?: (value: string) => void;
  /** The frame without the filters. */
  framed?: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const expandable = rows.some((r) => r.expand);

  const table = (
    <table className="a11y-datatable">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
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
          /* The row tint stays inline: it is per-row data from the
             conformance results, not a design decision this component can
             make. Everything else is in the stylesheet. */
          const rowStyle: CSSProperties = r.background ? { background: r.background } : {};
          return (
            <Fragment key={r.id}>
              <tr style={rowStyle}>
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
                  <td
                    key={headers[i].key}
                    /* data-numeric drives the display-numeral treatment in
                       CSS. A right-aligned column in this report is always a
                       count, which is why alignment can imply it. */
                    data-numeric={headers[i].align === "right" ? "true" : undefined}
                    style={{ textAlign: headers[i].align || "left" }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
              {r.expand && isOpen ? (
                <tr className="a11y-dt-expand-row">
                  <td colSpan={headers.length + (expandable ? 1 : 0)}>{r.expand}</td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );

  if (!filters && !framed) return table;

  return (
    <div className="a11y-datatable-frame">
      {filters ? (
        <FilterPills filters={filters} value={filter} onChange={onFilterChange} />
      ) : null}
      {table}
    </div>
  );
}
