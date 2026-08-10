import { useState } from "react";
import type { AuthConfig } from "../api/scanClient";

// Lets someone scan the pages that sit behind a login. Checkout, account
// settings and booking flows are where an accessibility failure actually costs
// a business money, and a scanner that stops at the login wall never sees them.
//
// Asking for a password puts an obligation on this form to be straight about
// what happens to it. The disclosure below is not boilerplate: the credentials
// travel to the scanning service, and the screenshot taken after signing in
// may contain whatever that account can see. Someone should be able to decide
// knowingly, which is why the advice to use a throwaway test account is given
// prominence rather than buried.

/* The trigger and the panel are rendered in two different places now — the
   design puts the trigger INSIDE the address field and the panel below it —
   so the open state, the panel's id and the trigger's ref are lifted to the
   caller and handed back here. Splitting them any other way (a popover, a
   portal) would have taken the panel out of flow and floated it over the
   submit bar. */
export function LoginFields({
  auth,
  onChange,
  disabled,
  open,
  setOpen,
  panelId,
  toggleRef,
}: {
  auth: AuthConfig | undefined;
  onChange: (auth: AuthConfig | undefined) => void;
  disabled: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  panelId: string;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function update(next: { loginUrl?: string; username?: string; password?: string }) {
    const merged = {
      loginUrl: next.loginUrl ?? loginUrl,
      username: next.username ?? username,
      password: next.password ?? password,
    };
    setLoginUrl(merged.loginUrl);
    setUsername(merged.username);
    setPassword(merged.password);
    // Only send auth once all three are present; a half-filled form would
    // just produce a failed sign-in.
    const complete = merged.loginUrl.trim() && merged.username.trim() && merged.password;
    onChange(complete ? { kind: "form", ...merged } : undefined);
  }

  function close() {
    setOpen(false);
    onChange(undefined);
    toggleRef.current?.focus();
  }

  // A form that's some-but-not-all filled in is silently treated as "no
  // auth" (see the comment in update() above) — that's the right call for
  // what gets sent, but saying nothing left a visitor who filled in two of
  // three fields believing the scan would sign in when it never would.
  function readinessMessage(): string {
    if (auth) return "Ready. The scan will sign in first.";
    const missing: string[] = [];
    if (!loginUrl.trim()) missing.push("the login page address");
    if (!username.trim()) missing.push("a username or email");
    if (!password) missing.push("a password");
    if (missing.length === 0 || missing.length === 3) return "";
    const what = missing.length === 1 ? missing[0] : "the rest";
    return `Add ${what} to sign in during the scan. Or clear the other fields to scan without a login.`;
  }

  return (
    <div>
      <div id={panelId} className="a11y-login" hidden={!open}>
        {/* fieldset/legend rather than a styled heading: the three fields are
            one group, and the legend is what a screen reader repeats as
            context when focus lands on any of them. */}
        <fieldset className="a11y-login-fieldset">
          {/* Closes the panel and hands focus back to the trigger, which is
              what close() already does for Cancel — so Escape, Cancel and this
              all land in the same place. The glyph is aria-hidden; the button's
              own name carries the meaning. */}
          <button
            type="button"
            className="a11y-login-close"
            onClick={close}
            aria-label="Close the sign-in panel"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <legend className="a11y-login-legend">Sign the scanner in</legend>

          <p className="a11y-login-note">
            Use a test account, not your own. We sign in and scan the page, then throw the session away.
            We save nothing. The page we photograph will show whatever that account can see.
          </p>

          <div className="a11y-stmt-fields">
            <label className="a11y-stmt-field">
              Login page address
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                placeholder="example.com/login"
                value={loginUrl}
                onChange={(e) => update({ loginUrl: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="a11y-stmt-field">
              Username or email
              <input
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => update({ username: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="a11y-stmt-field">
              Password
              <input
                type="password"
                // Off, so the browser doesn't offer to remember a test login the
                // person is unlikely to want kept.
                autoComplete="off"
                value={password}
                onChange={(e) => update({ password: e.target.value })}
                disabled={disabled}
              />
            </label>
          </div>

          {/* A status region so "the scan will now sign in first" reaches
              someone who can't see the text appear. Mounted while open, empty
              until true. */}
          <p className="a11y-login-ready" role="status">
            {readinessMessage()}
          </p>

          <button
            type="button"
            className="a11y-login-toggle"
            onClick={close}
            disabled={disabled}
          >
            Cancel — scan without a login
          </button>
        </fieldset>
      </div>
    </div>
  );
}
