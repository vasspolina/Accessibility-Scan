import * as React from "react";

export interface DialogProps {
  open: boolean; title: string; children?: any; primaryLabel?: string; onPrimary?: () => void;
  secondaryLabel?: string; onClose?: () => void; danger?: boolean; style?: object;
}
export function Dialog(props: DialogProps): JSX.Element | null;
