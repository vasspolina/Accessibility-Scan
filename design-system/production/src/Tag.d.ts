import * as React from "react";

export interface TagProps { tone?: "gray" | "blue" | "red" | "green"; children?: any; style?: object; }
export function Tag(props: TagProps): JSX.Element;
