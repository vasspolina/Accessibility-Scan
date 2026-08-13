import { Fragment, useState } from "react";
import type { ReactNode } from "react";

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
 */

export interface TableHeader {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface TableRow {
  id: string;
  cells: ReactNode[];
  expand?: ReactNode;
  /** Row state as a NAME, not a colour. Styling lives in the stylesheet;
   *  callers say what a row IS, never what it should look like. */
  state?: "issue" | "current" | "pass";
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
    <>
      {/* The same words as the <caption>, as a sibling the table algorithm
          does not size. A caption is sized by that algorithm, so any
          `display` set on it drops it out of table formatting and it
          shrinks to its own content — 131px against a 952px table, which
          is how the purple panel's label came to sit clipped over the row
          above it. Styling that needs a real box goes here; the caption
          below stays the table's accessible name and is hidden from sight
          wherever this is shown, so the words are never announced twice.
          Hidden by default — only the purple panel opts in. */}
      {caption ? (
        <p className="a11y-dt-label" aria-hidden="true">
          {caption}
        </p>
      ) : null}
      <table className="a11y-datatable">
        {caption ? <caption className="a11y-dt-caption">{caption}</caption> : null}
      <thead>
        <tr>
          {expandable ? <td aria-hidden="true" className="a11y-dt-spacer" /> : null}
          {headers.map((h) => (
            <th
              key={h.key}
              scope="col"
              /* The column's own name, so a stylesheet can size one column
                 without having to guess it from alignment. These tables are
                 table-layout: fixed, where the header row decides every
                 column width — so a width meant for a body cell has to be
                 set here or it does nothing. */
              data-col={h.key}
              data-align={h.align || "left"}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open.has(r.id);
          /* Row state is a name, never a colour — the stylesheet decides
             what "issue" looks like. It used to be an inline background
             carrying a dead token and a hardcoded #fff1f1 fallback. */
          return (
            <Fragment key={r.id}>
              <tr
                data-row-state={r.state}>
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
                    data-col={headers[i].key}
                    data-align={headers[i].align || "left"}
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
    </>
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
