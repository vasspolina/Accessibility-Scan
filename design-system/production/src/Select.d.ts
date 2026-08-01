import * as React from "react";

export interface SelectProps {
  id: string; label: string; options: Array<string | { value: string; label: string }>;
  value?: string; defaultValue?: string; onChange?: (e: any) => void;
  helperText?: string; disabled?: boolean; style?: object;
}
export function Select(props: SelectProps): JSX.Element;
