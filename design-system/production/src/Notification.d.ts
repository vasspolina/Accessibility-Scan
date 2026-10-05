import * as React from "react";

export interface NotificationProps {
  kind?: "error" | "success" | "warning" | "info"; title: string; subtitle?: string;
  onClose?: () => void; style?: object;
}
export function Notification(props: NotificationProps): JSX.Element;
