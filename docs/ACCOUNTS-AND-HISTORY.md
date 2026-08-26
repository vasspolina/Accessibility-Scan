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

```
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

Scan with the key again and the conformance report for buyers fills in the
rows a person has answered, each remark citing who decided and when. A
criterion the scan proved failing stays "Does Not Support" whatever anyone
recorded: an opinion does not un-break the thing the scanner is looking at.
Rows nobody has answered stay blank, exactly as before.
