import * as React from "react";

export interface WhatsNextPanelItem {
  criterion: string;
  title: string;
  level: "A" | "AA" | "AAA";
}

export interface WhatsNextPanelProps {
  standard: string;
  expected?: string;
  failCount?: number;
  description?: string;
  items?: WhatsNextPanelItem[];
  style?: object;
}
export function WhatsNextPanel(props: WhatsNextPanelProps): JSX.Element;
