import * as React from "react";

export interface AccessibilityStatementField {
  field: string;
  value: string;
  caption?: string;
}

export interface AccessibilityStatementBuilderProps {
  title?: string;
  intro?: string;
  orgLabel?: string;
  orgPlaceholder?: string;
  org?: string;
  onOrgChange?: (e: any) => void;
  emailLabel?: string;
  emailPlaceholder?: string;
  email?: string;
  onEmailChange?: (e: any) => void;
  fields?: AccessibilityStatementField[];
  position?: string;
  failedCount?: number;
  statement?: string;
  style?: object;
}
export function AccessibilityStatementBuilder(props: AccessibilityStatementBuilderProps): JSX.Element;
