import * as React from "react";

export interface WhatsNextPanelItem {
  criterion: string;
  title: string;
  level?: string;
}

export interface WhatsNextPanelProps {
  eyebrow?: string;
  standard: string;
  expected?: string;
  failCount?: number;
  description?: string;
  items?: WhatsNextPanelItem[];
  defaultOpen?: boolean;
  style?: object;
}
export function WhatsNextPanel(props: WhatsNextPanelProps): JSX.Element;
