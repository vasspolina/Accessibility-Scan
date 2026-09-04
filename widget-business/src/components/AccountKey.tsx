import { useId, useState } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { fetchAccount, ScanError } from "../api/scanClient";
import { clearApiKey, getApiKey, looksLikeKey, setApiKey } from "../lib/apiKey";

/**
 * The account key, as one row of the run's settings.
 *
 * Until this existed no path in the widget attached a key, so nothing a
 * person did here was ever saved: history, questions and verdicts were
 * features of the API alone. With a key set, every scan from now on joins
 * the server's record and the open questions below the conformance table
 * can be answered.
 *
 * A pasted key is checked against the server before it is kept, so a wrong
 * one is refused here rather than failing quietly on every later request —
 * the pattern this product has been bitten by more than once.
 */
export function AccountKey({
  apiBase,
  onChange,
}: {
  apiBase: string;
  /** Fires after a key is kept or cleared, so the caller can refetch. */
  onChange: () => void;
}) {
  const [key, setKey] = useState(getApiKey());
  const [draft, setDraft] = useState("");
  const [who, setWho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function keep() {
    setError(null);
    if (!looksLikeKey(draft)) {
      setError("That is not an account key. One starts with ascan_ and is 70 characters long.");
      return;
    }
    setBusy(true);
    setApiKey(draft);
    try {
      const account = await fetchAccount(apiBase);
      setKey(draft);
      setDraft("");
      setWho(account.label || account.email);
      onChange();
    } catch (err) {
      clearApiKey();
      setError(err instanceof ScanError ? err.message : "The server did not accept that key.");
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    clearApiKey();
    setKey("");
    setWho(null);
    onChange();
  }

  return (
    <div className="a11y-settings-row">
      <span className="a11y-settings-label" id={`${id}-label`}>
        Account
      </span>
      {key ? (
        <>
          <span className="a11y-settings-state">
            {who ? `Signed in as ${who}. ` : "Key kept. "}
            Scans from now on are saved, and the open questions can be answered.
          </span>
          <Button variant="ghost" size="sm" onClick={forget}>
            Forget this key
          </Button>
        </>
      ) : (
        <>
          <span className="a11y-settings-state">
            Not signed in. Nothing is saved, which is the default.
          </span>
          <Input
            id={`${id}-key`}
            label="Account key"
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ascan_…"
            invalid={Boolean(error)}
            invalidText={error ?? undefined}
            disabled={busy}
            inputProps={{ autoComplete: "off", spellCheck: false }}
          />
          <Button variant="secondary" size="sm" onClick={keep} disabled={busy || !draft}>
            {busy ? "Checking…" : "Keep this key"}
          </Button>
        </>
      )}
    </div>
  );
}
