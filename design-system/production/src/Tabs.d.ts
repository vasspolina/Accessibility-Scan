import * as React from "react";

export interface TabsProps {
  items: Array<{ id: string; label: string; panel?: any }>;
  defaultId?: string; onChange?: (id: string) => void; style?: object;
}
export function Tabs(props: TabsProps): JSX.Element;
