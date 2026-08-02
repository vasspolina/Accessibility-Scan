// Shown when a site turns the scanner away: bot protection, a CAPTCHA, a
// "confirm you are human" wall. This isn't the visitor's mistake, so it gets
// guidance rather than a red error.
//
// We do not try to defeat the check. A site owner put it there on purpose.
// Every route below reaches the site through access the person already has,
// or through the owner choosing to let the scanner in.

export function BlockedNotice({ message }: { message: string }) {
  return (
    <section className="a11y-blocked" role="status">
      <p className="a11y-blocked-lead">{message}</p>
      <p className="a11y-blocked-body">
        This isn't something to work around. The site guards itself on purpose, and we won't
        try to slip past that. A few honest ways in:
      </p>
      <ul className="a11y-blocked-list">
        <li>
          <strong>Scan your staging site.</strong> Most sites have one without bot protection. It's
          the same code, so the report is the same.
        </li>
        <li>
          <strong>Allow the scanner through.</strong> In your firewall or WAF (Cloudflare, Akamai
          and the rest), allow the user agent <code>A11yCheckerBot</code>, or our IP. A few minutes,
          and it's the sanctioned way for a testing tool to get in.
        </li>
        <li>
          <strong>Sign in with a session.</strong> If you can already reach the page in your own
          browser, use the login option above to hand the scanner your session. It arrives past the
          wall, never through it.
        </li>
      </ul>
    </section>
  );
}
