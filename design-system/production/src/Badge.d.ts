import * as React from "react";

export interface BadgeProps { count: number | string; label?: string; style?: object; }
export function Badge(props: BadgeProps): JSX.Element;
