import * as React from "react";

export interface CheckboxProps {
  id: string; label: string; checked?: boolean; defaultChecked?: boolean;
  onChange?: (e: any) => void; disabled?: boolean; style?: object;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
