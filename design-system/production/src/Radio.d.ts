import * as React from "react";

export interface RadioProps {
  id: string; name: string; value: string; label: string; checked?: boolean;
  defaultChecked?: boolean; onChange?: (e: any) => void; disabled?: boolean; style?: object;
}
export function Radio(props: RadioProps): JSX.Element;
