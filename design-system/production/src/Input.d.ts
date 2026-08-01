import * as React from "react";

export interface InputProps {
  id: string; label: string; type?: string; value?: string; defaultValue?: string;
  onChange?: (e: any) => void; placeholder?: string; helperText?: string;
  invalid?: boolean; invalidText?: string; disabled?: boolean; style?: object;
}
export function Input(props: InputProps): JSX.Element;
