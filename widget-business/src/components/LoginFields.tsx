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

export function LoginFields({
  auth,
  onChange,
  disabled,
}: {
  auth: AuthConfig | undefined;
  onChange: (auth: AuthConfig | undefined) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <button
        type="button"
        className="a11y-login-toggle"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Scan a page behind a login
      </button>
    );
  }

  return (
    <div className="a11y-login">
      <div className="a11y-login-head">
        <strong>Sign the scanner in</strong>
        <button
          type="button"
          className="a11y-login-toggle"
          onClick={() => {
            setOpen(false);
            onChange(undefined);
          }}
          disabled={disabled}
        >
          Cancel
        </button>
      </div>

      <p className="a11y-login-note">
        Use a test account, not your own. We sign in, scan the page, and throw the session away.
        Nothing is saved. The page we photograph will show whatever that account can see.
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

      {auth && <p className="a11y-login-ready">Ready. The scan will sign in first.</p>}
    </div>
  );
}
