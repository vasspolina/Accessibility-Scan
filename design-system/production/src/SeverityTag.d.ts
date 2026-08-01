import * as React from "react";

export interface SeverityTagProps {
  severity: "critical" | "serious" | "moderate" | "minor" | "pass"; style?: object;
}
export function SeverityTag(props: SeverityTagProps): JSX.Element;
