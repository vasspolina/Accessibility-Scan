import React from "react";
export function SkipLink({ href = "#main", children = "Skip to main content" }) {
  return <a className="a11y-skip-link" href={href}>{children}</a>;
}
