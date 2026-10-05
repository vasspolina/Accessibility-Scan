import * as React from "react";

export interface FindingDetailProps {
  who?: React.ReactNode;
  whatFound?: React.ReactNode;
  whatToDo?: React.ReactNode;
  affectedLabel?: string;
  affected?: React.ReactNode;
  technicalLabel?: string;
  technical?: React.ReactNode;
  defaultTechnicalOpen?: boolean;
  style?: object;
}
export function FindingDetail(props: FindingDetailProps): JSX.Element;
