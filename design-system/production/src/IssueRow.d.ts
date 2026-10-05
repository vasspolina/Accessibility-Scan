import * as React from "react";

export interface IssueRowProps {
  severity: "critical" | "serious" | "moderate" | "minor" | "pass";
  title: string; criterion: string; count?: number; selector?: string;
  onClick?: () => void; style?: object;
}
export function IssueRow(props: IssueRowProps): JSX.Element;
