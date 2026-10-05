import * as React from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; type?: "button" | "submit"; disabled?: boolean;
  onClick?: () => void; children?: any; style?: object;
}
export function Button(props: ButtonProps): JSX.Element;
