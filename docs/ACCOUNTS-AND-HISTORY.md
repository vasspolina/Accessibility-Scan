# Accounts, history, and recorded verdicts

Three features that share one database, all of them off until a deployer
turns them on. With no `DB_PATH` the scanner behaves exactly as it always
has — anonymous, nothing saved — and every route below answers `501 Not set
up` with the reason, rather than half-working.

Check what a deployment has:

```bash
curl https://your-scanner/api/storage
```

```json
{ "storage": { "configured": true, "durable": false,
  "reason": "Storage is working but not marked durable. A container filesystem is erased on deploy — mount a volume and set DB_DURABLE=true once DB_PATH points inside it." } }
```

`durable: false` is the honest answer to a real risk: a container filesystem
is wiped on every deploy, and storage that works perfectly and then vanishes
is worse than none, because people trust it first. Point `DB_PATH` inside a
mounted volume and set `DB_DURABLE=true` to say so.

`size` says how much is stored and `retention` what is pruned: scans older
than `SCAN_RETENTION_DAYS` (365) or beyond `SCANS_PER_SITE_MAX` (200) per
site go when a new one is saved. Verdicts are never pruned — they are the
record. Schema changes are migrated in place on start (`PRAGMA
user_version`), so an older database file catches up rather than failing on
the first new column.

## In the product

The widget has an **Account** row in the run's settings. Paste a key there
and it is checked against the server before it is kept; from then on every
scan from that browser is saved, the "since last time" comparison comes
from the server's history rather than this browser's, and a **Manual
checks** section appears under the conformance table with the open
questions and a form to answer each. Without a key nothing changes.

## Accounts

There is no sign-up flow, no email verification and no billing. Inventing
those here would be three half-built things instead of one finished one, so
an account is created by an operator and the API key it mints is what
everything authenticates with.

```bash
curl -X POST https://your-scanner/api/accounts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"team@example.com","label":"Example Ltd","keyName":"ci"}'
```

The key comes back **once**. Only its SHA-256 hash is stored, so it cannot be
shown again — a database that leaks must not hand over the keys with it.

Without `ADMIN_TOKEN` set, that route is closed rather than open. An operator
endpoint that defaults to public is the kind of default that ends up in an
incident report.

```
GET    /api/accounts          every account, with how much each holds
DELETE /api/accounts/:id      remove one and everything it owns — the
                              GDPR Article 17 answer; the counts come back
GET    /api/account/export    everything this account holds, as one
                              document — the Article 15 answer, and a
                              backup a person can take without asking
```

## History

Send the key with a scan and it is kept:

```bash
curl -X POST https://your-scanner/api/scan \
  -H "Authorization: Bearer ascan_…" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

The response gains `savedAs`. Without a key nothing changes and nothing is
saved — anonymous scanning stays the default, and a storage failure never
costs a caller their report.

A report scanned elsewhere — by the CLI, which never passes through the
hosted service — joins the same record through `POST /api/scans` with the
report as the body. The CLI does this itself with `--server` and
`--api-key`.

```
POST   /api/scans                    save a report scanned elsewhere
GET    /api/scans?origin=…&limit=…   the list, newest first, each with
                                     scoreChange against the previous scan
                                     of the same site
GET    /api/scans/:id                the full report as it was
DELETE /api/scans/:id                remove one
```

## Guided manual testing

The scan already names precisely what it cannot decide, criterion by
criterion, in a reader's language. What it could not do was let anyone
**answer**. That mattered more than it sounds: the conformance report for
buyers deliberately leaves the Conformance Level blank on every non-failing
row, because a scan can evidence a failure and never conformance — so the
document could not be completed inside the product no matter how much human
work went into the site.

A recorded verdict is the missing piece.

```bash
curl "https://your-scanner/api/verdicts/questions?origin=https://example.com" \
  -H "Authorization: Bearer ascan_…"
```

The questions come from that site's own most recent stored scan, not from a
fixed list — so a criterion the scanner learns to decide stops being asked
the day that probe ships. The list shrinks as the scanner improves.

```bash
curl -X POST https://your-scanner/api/verdicts \
  -H "Authorization: Bearer ascan_…" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://example.com","criterion":"1.2.2",
       "status":"not-applicable","note":"The site has no video content.",
       "decidedBy":"Alex Rahim"}'
```

`pageUrl` says which page it was checked on and `answersCheck` names the
undecided item it answers; both optional, both kept.

`status` is one of `supports`, `partially-supports`, `does-not-support`,
`not-applicable` — the four terms an ACR permits — plus `unresolved`, which
means looked at and not yet decided. That is a different fact from never
having looked, and the two must not collapse into each other.

Three rules keep it honest:

- **A verdict belongs to a site, not a scan.** "Do your videos have captions"
  is answered about the site and holds for every later scan until someone
  changes it. Otherwise every re-scan would ask the same questions again,
  which is the thing that makes manual testing feel pointless.
- **A verdict never overwrites.** Changing one writes a new row pointing at
  the old, so who said what, and when, survives being changed later. An
  accessibility statement is a document people rely on; its history is part
  of it. `GET /api/verdicts?origin=…&criterion=…` returns that trail.
- **A verdict nobody signed is refused**, as is a criterion no report covers
  — a typo would otherwise store a decision nothing will ever read.

### What it changes in the report

Scan with the key again and the conformance table shows each decision
beside the row it answers, and the conformance report for buyers fills in
those rows, each remark citing who decided and when. A
criterion the scan proved failing stays "Does Not Support" whatever anyone
recorded: an opinion does not un-break the thing the scanner is looking at.
Rows nobody has answered stay blank, exactly as before.

## Triage

A scanner that cannot be told "this one is a false positive" reports the
same thing every run until the owner stops reading it. Every finding now
carries a `fingerprint` — rule plus selector, minted on the server, the same
identity the CLI's baseline and SARIF use — and the owner can mark it:

```bash
curl -X POST https://your-scanner/api/findings/state \
  -H "Authorization: Bearer ascan_…" -H "Content-Type: application/json" \
  -d '{"origin":"https://example.com","fingerprint":"0123456789abcdef",
       "state":"false-positive","note":"Decorative image.","decidedBy":"Alex Rahim"}'
```

`state` is `open`, `ignored`, `false-positive` or `fixed`. A mark belongs
to the site and never overwrites — the history of who decided what is kept.
Marked findings come back on the next signed-in scan with a `triage` field,
the widget shows the mark on the card and offers **Mark this finding** on a
saved scan, and the CLI leaves ignored and false-positive findings out of its
thresholds while printing how many it left out.

What triage does not do is change the score. A finding marked ignored is
still a measured fault; the score's whole value is that it is not a record
of what the owner felt like counting.

## Site audits

A site audit made with the key is saved like a scan (`savedAs` on the
response) and listed at `GET /api/audits`. When a site has both, the open
questions come from whichever is newer — an audit describes the site, a
scan one page, and the site's questions are the right ones to ask.

## Scheduled scans

The standing instruction behind "tell me when it gets worse":

```bash
curl -X POST https://your-scanner/api/schedules \
  -H "Authorization: Bearer ascan_…" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","everyHours":24,"notifyEmail":"team@example.com"}'
```

The first run is due at once, so a wrong URL shows up in minutes rather
than a day later. Each run is saved into the history; a run that fails is
recorded with its error and rescheduled rather than retried every minute.
"Worse" is measured: the score fell, or a finding appeared whose fingerprint
the previous run did not have. Only then is the email sent — and only when
`MAIL_API_KEY` and `MAIL_FROM` are set; `GET /api/schedules` reports whether
mail is configured and what the scheduler last did.

The scheduler runs inside the server, one scan at a time, on a tick of
`SCHEDULER_TICK_SECONDS` (60). With several instances on one database, set
`SCHEDULER_ENABLED=false` on all but one.

```
GET    /api/schedules              the list, with the scheduler's status
POST   /api/schedules              create; the URL passes the same
                                   private-address guard as a scan
POST   /api/schedules/:id/run      make it due now
POST   /api/schedules/:id/enabled  {"enabled": false} to pause
DELETE /api/schedules/:id
```
