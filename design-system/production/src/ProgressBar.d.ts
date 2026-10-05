import * as React from "react";

export interface ProgressBarProps { value: number; max?: number; label: string; style?: object; }
export function ProgressBar(props: ProgressBarProps): JSX.Element;
