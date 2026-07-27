import type { AccessibilityFinding } from "../api/scanClient";

// Finds the case where a long list of findings is really one mistake.
//
// A typical report is far more repetitive than it looks: measured across real
// scans, 24 findings turn out to be 9 distinct problems. Thirteen contrast
// failures on smashingmagazine.com are thirteen instances of one topic link,
// and a reader shown thirteen rows reasonably concludes there are thirteen
// things to do. There is one, in a template, and saying so is the difference
// between a chore and an afternoon.
//
// The signature is deliberately conservative. Over-merging is the dangerous
// error here — telling someone two genuinely different problems are one sends
// them away thinking they are finished — so anything uncertain stays separate.

/**
 * Reduces a selector to the shape of the thing it points at, dropping the
 * parts that only say *which* instance this is.
 *
 * `a[href$="ux/"]` and `a[href$="css/"]` become the same shape, because the
 * attribute value is the instance and the attribute is the component.
 * `li:nth-child(1) > a` and `li:nth-child(7) > a` likewise.
 */
export function componentSignature(selector: string): string {
  return selector
    .trim()
    // Positional indices identify the instance, never the component.
    .replace(/:nth-(child|of-type|last-child|last-of-type)\([^)]*\)/g, "")
    // Attribute values are the instance; keep the attribute name.
    .replace(/\[([^\]=~^$*|]+)([~^$*|]?=)("[^"]*"|'[^']*'|[^\]]*)\]/g, "[$1]")
    // Ids are unique by definition, so they can never indicate a repeat.
    .replace(/#[\w-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ComponentCluster {
  signature: string;
  count: number;
  /** How much of the group this cluster accounts for, 0 to 1. */
  share: number;
}

// Below three instances there is no template to speak of, and a reader can
// simply read the rows.
const MIN_INSTANCES = 3;
// Below this the group is genuinely several different problems and calling it
// one would be wrong.
const MIN_SHARE = 0.6;

/**
 * The dominant repeated component in a group of findings, when there is one.
 *
 * Returns null when the findings are genuinely varied — which is the honest
 * answer far more often than not, and the reason this reports a single
 * dominant cluster rather than partitioning everything into buckets.
 */
export function dominantComponent(findings: AccessibilityFinding[]): ComponentCluster | null {
  if (findings.length < MIN_INSTANCES) return null;

  const counts = new Map<string, number>();
  for (const f of findings) {
    const sig = componentSignature(f.selector ?? "");
    // A selector that reduces to nothing tells us nothing.
    if (!sig || sig === "html" || sig === "body") continue;
    counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best: ComponentCluster | null = null;
  for (const [signature, count] of counts) {
    const share = count / findings.length;
    if (count >= MIN_INSTANCES && share >= MIN_SHARE && (!best || count > best.count)) {
      best = { signature, count, share };
    }
  }
  return best;
}

/**
 * A short, honest name for the repeated thing.
 *
 * Deliberately does not try to invent a product name for it. Guessing that
 * `.books__book__wrapper` is "the book card" reads well right up until it is
 * wrong, and the selector shape is something a developer can act on directly.
 */
export function describeComponent(signature: string): string {
  // The most distinctive class anywhere in the path, not the leaf. For
  // ".books__book__wrapper > .col > a" the leaf is a bare <a>, which tells a
  // developer nothing; the wrapper class is the component and points straight
  // at the template. Longest wins as a proxy for most specific: layout helpers
  // are short (.col, .row) and component names are not.
  const classes = [...signature.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  if (classes.length > 0) {
    const best = classes.reduce((a, b) => (b.length > a.length ? b : a));
    return `.${best}`;
  }
  const last = signature.split(/[>\s]+/).filter(Boolean).pop() ?? signature;
  const tag = last.match(/^([a-zA-Z][\w-]*)/)?.[1];
  return tag ? `<${tag}>` : signature.slice(0, 40);
}
