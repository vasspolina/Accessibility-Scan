import * as React from "react";

export interface ToastProps {
  kind?: "error" | "success" | "warning" | "info"; title: string; caption?: string;
  onClose?: () => void; style?: object;
}
export function Toast(props: ToastProps): JSX.Element;
