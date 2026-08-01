import * as React from "react";

export interface IconButtonProps {
  label: string; size?: "sm" | "md" | "lg"; variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean; onClick?: () => void; children?: any; style?: object;
}
export function IconButton(props: IconButtonProps): JSX.Element;
