import * as React from "react";

export type Severity = "critical" | "serious" | "moderate" | "minor" | "pass";

export interface SeverityTagProps {
  severity?: Severity;
  /** Overrides the built-in word, for products with their own severity
   *  vocabulary (this one says "Fix first", not "Critical"). */
  label?: string;
  style?: object;
}
export function SeverityTag(props: SeverityTagProps): JSX.Element;
