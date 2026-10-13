import { t } from "../lib/strings";

// Shown when a site turns the scanner away: bot protection, a CAPTCHA, a
// "confirm you are human" wall. This isn't the visitor's mistake, so it gets
// guidance rather than a red error.
//
// We do not try to defeat the check. A site owner put it there on purpose.
// Every route below reaches the site through access the person already has,
// or through the owner choosing to let the scanner in.

// Not a live region: it mounts already carrying its full text, which
// assistive tech treats as no change and never announces. The scan
// outcome is spoken by App's persistent status paragraph instead.
export function BlockedNotice({ message }: { message: string }) {
  const [agentBefore, agentAfter] = t(
    "In your firewall or bot protection (Cloudflare, Akamai and the rest), allow the user agent {agent}, or our IP. A few minutes, and it's the sanctioned way for a testing tool to get in."
  ).split("{agent}");
  return (
    <section className="a11y-blocked">
      <p id="a11y-blocked-lead" className="a11y-blocked-lead">{message}</p>
      <p className="a11y-blocked-body">
        {t("This isn't something to work around. The site guards itself on purpose, and we won't try to slip past that. A few honest ways in:")}
      </p>
      <ul className="a11y-blocked-list">
        <li>
          <strong>{t("Scan your staging site.")}</strong>{" "}
          {t("Most sites have one without bot protection. It's the same code, so the report is the same.")}
        </li>
        <li>
          <strong>{t("Allow the scanner through.")}</strong> {agentBefore}
          <code>A11yCheckerBot</code>
          {agentAfter}
        </li>
        <li>
          <strong>{t("Sign in with a session.")}</strong>{" "}
          {t("If you can already reach the page in your own browser, use the form's login option. The scanner signs in with access you already have, not by defeating the block.")}
        </li>
      </ul>
    </section>
  );
}
