import * as React from "react";

export interface SwitchProps {
  id: string; label: string; checked: boolean; onChange: (next: boolean) => void;
  disabled?: boolean; style?: object;
}
export function Switch(props: SwitchProps): JSX.Element;
