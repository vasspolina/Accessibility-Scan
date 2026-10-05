import * as React from "react";

export interface DataTableHeader { key: string; label: string; align?: "left" | "right"; width?: number | string; }
export interface DataTableRow { id: string; cells: React.ReactNode[]; expand?: React.ReactNode; background?: string; }
export function DataTable(props: { caption?: string; headers: DataTableHeader[]; rows: DataTableRow[] }): JSX.Element;
