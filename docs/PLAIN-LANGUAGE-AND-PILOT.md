# Plain-language model and the assistive-technology pilot

Two features that share one small language model you host yourself.

1. **The plain-language rewrite.** During a scan, the model rewrites each axe
   rule's findings into a plain title, an explanation about this page's
   elements, and a fix. Code: `backend/src/services/plainLanguage/`.
2. **The pilot.** Report a barrier, a short conversation inside the scan
   widget (since 20 Nov 2026; before that its own page, `/pilot.html`,
   which now sends people on) where people who use assistive technology
   report a barrier. It opens from Report a barrier in the widget's
   conversations panel, or from a link ending `#report-a-barrier`. It asks
   one thing at a time with answers to pick, the same model drafts a
   detailed finding, and the participant reads it, says what is wrong with
   it if anything, and sends it. Code: `backend/src/services/pilot/`,
   `backend/src/routes/pilot.ts`,
   `widget-business/src/components/BarrierReport.tsx`.

Both follow the repository's rule for optional features: with nothing set,
they say they are not set up, and nothing fails.

## Hosting the model

Any server that speaks the OpenAI chat API works. The default model is
Qwen2.5 7B Instruct (under 10B parameters, keeps to a JSON reply reliably,
writes all four report languages).

Ollama, on a machine with a GPU (8 GB of VRAM is enough for the 4-bit build):

```bash
ollama pull qwen2.5:7b-instruct
OLLAMA_HOST=0.0.0.0 ollama serve        # listens on :11434
```

llama.cpp, the same model as a GGUF file:

```bash
llama-server -m Qwen2.5-7B-Instruct-Q4_K_M.gguf --host 0.0.0.0 --port 8080 -c 8192 -np 2
```

Llama 3.1 8B Instruct works the same way. Set `LOCAL_LLM_MODEL` to the name
your server uses for it.

**Do not run the model inside the Railway container.** That container is
sized for two Chromium renders (`MAX_CONCURRENT_RENDERS`). A 7B model on its
CPU takes tens of seconds for each rule, and the rewrite would run out of
time on every scan. Run the model on its own GPU machine and keep it
reachable only from the backend: a private network, or a reverse proxy that
checks a token (`LOCAL_LLM_API_KEY`).

## Settings (backend)

| Variable | What it does |
|---|---|
| `LOCAL_LLM_URL` | Base URL of the model server, e.g. `http://gpu-box:11434`. Absent: both features run without the model. |
| `LOCAL_LLM_MODEL` | Model name as the server knows it. Default `qwen2.5:7b-instruct`. |
| `LOCAL_LLM_API_KEY` | Bearer token, only if a proxy in front of the server checks one. |
| `LOCAL_LLM_TIMEOUT_MS` | The rewrite's whole budget per scan. Default 45000. |
| `PLAIN_LANGUAGE_IN_SCANS` | `true` lets scans use the model too. **Unset (the default), only the pilot uses it**: every public scan would otherwise call the model and keep a paid GPU worker awake, so the bill would follow the scanner's traffic. |
| `DB_PATH` (+ `DB_DURABLE`) | Where pilot reports are stored. Use a mounted volume. |
| `MAIL_API_KEY`, `MAIL_FROM` | Optional: each pilot report is also mailed to `CONTACT_TO`. |
| `ADMIN_TOKEN` | Needed to read the pilot's reports and totals. |

The pilot form will not start unless reports have somewhere to go (storage
or mail), so a participant never writes into a pilot that cannot keep it.

## How the rewrite behaves

Only with `PLAIN_LANGUAGE_IN_SCANS=true`. Without it, scans report
`meta.plainLanguage.status: "off_for_scans"` and keep the hand-written copy.


- One model call per axe rule, not per element: the report shows one card per
  rule. The model is shown up to three of the rule's elements and the total.
- The most severe rules go first, at most 20 per scan, two at a time. It runs
  beside the AI review, so it adds little time to a scan unless the model is
  slow.
- **It changes words only.** Severity, WCAG criterion, level, selector and
  score are still the measurement's.
- It counts as AI: when the reader switches the AI review off, the rewrite is
  off too.
- Each report says how it went: `meta.plainLanguage` gives the status
  (`completed`, `partial`, `timed_out`, `failed`, `not_configured`,
  `disabled_by_request`), the model, and how many rules it rewrote.
- The widget uses the model's words only if they are in the language the
  report is read in. Otherwise it falls back to the hand-written copy in
  `wcagPlain.ts`, then to axe's own text. A card the model worded says so
  under "Where this came from".

`/healthz` reports `plainLanguageModel` (the model configured, or null) and
`pilotOpen`. Configured is not the same as answering. A scan's
`meta.plainLanguage.status` shows whether the model answered.

## Running the pilot

The form is a conversation (since 19 Nov 2026): one question on the page
at a time, its words the label of the one answer field, with answers to
pick under it so a report can be made without typing. The order is fixed:

1. **What do you use?** Six kinds to pick, or typed ("NVDA with Firefox",
   read as a screen reader, the words kept as the detail). Asked once: the
   answer is remembered in the participant's browser.
2. **Which page?** Typed or pasted, or "I don't have it".
3. **What happened?** A sentence, or one of a few sentences picked for what
   they use ("A button or link had no name"). With an address there is also
   "Scan the page instead".
4. **One follow-up at most** (`POST /api/pilot/followup`, `nextFollowUp`):
   the model reads what was said and picks the one question the owner
   would most need answered, or says the report is enough. It picks from
   seven questions written in each language (`FOLLOW_UP_QUESTIONS`: where
   on the page, which button, link or field, what the screen reader said,
   what happened instead, at which step), each with its own four answers to
   pick; it never words a question itself, since its own wording came out
   rough on the live worker, 20 Nov 2026. The screen reader question goes
   only to screen reader users. It has ten seconds
   (`FOLLOW_UP_TIMEOUT_MS`; about one second on a warm worker, measured 20
   Nov 2026). When it is off, still waking or answers off the list, "Where
   on the page was it?" is asked. Skip is always one of the answers. A
   typed report that already names an element and where it is ("the Pay
   now button on the checkout page") gets no follow-up and the model is
   not asked (`namesElementAndPlace`, word lists per language): on the
   live worker the model asked one of such reports every time. A picked
   sentence always gets its follow-up.
5. **The report**, written by the model, with Send report under it and one
   field: "Anything wrong?". What is typed there goes back to the model
   with the draft (`POST /api/pilot/draft` with `previous` and `change`)
   and the report is written again. If that fails, the report they already
   read stands.

The model's worker sleeps when idle and took over 100 seconds to wake when
measured (20 Nov 2026): a first report took 87 seconds, the same report
written again 4. So the view asks the server to wake it as it opens
(`POST /api/pilot/wake`), and once more at the first answer. The server
lets one wake call through per two minutes; each page view outside that
window wakes the paid worker.

Every answered question stays on the page with a Change button; changing
one keeps the later answers that still hold. What was asked and answered is
stored with their words (`barrierRecord`): the follow-up under "Asked:",
each change under "Asked: Change asked after reading the draft", and a
picked sentence marked "(picked from the suggested answers, not typed)".

The address answer reads what was typed the way a chat would (`POST /api/pilot/page`,
`services/pilot/readAddress.ts`): spaces, commas or "dot" before a domain
ending become dots, https:// goes in front, and a host that does not
resolve is passed to Claude (when `ANTHROPIC_API_KEY` is set) for the address
the person meant, kept only if that host resolves. "acsessobilty nl" reads as
https://accessibility.nl. A guessed address, or one that could not be
reached, is asked about before it is used ("Did you mean …?"); a sentence
typed there is taken as what happened. Only text nothing can be made of is
an error. The page is then
looked up (every hop goes through the SSRF guard and only the title comes
back), its title shown under the answer and given to the model as context.

There is no impact rating and no "what were you trying to do". The model
writes one finding at length (what happens, who it stops,
how to see it, what to change, its estimate of how much it holds people
back, and a suggested criterion), shown as finished text with one Send
button. With "Scan the page instead" the
page is scanned (no AI review, no screenshots) and the model drafts one
finding from the most serious measured problems, worded as what the scan
found, never as what the participant met. The form says so above the
report, and the stored report marks the draft `fromScan`; what they type
under "Anything wrong?" is then what happened, and the report is written
from that instead.

There is no invitation code (removed 17 Nov 2026): anyone with the link can
report, and the routes' rate limits bound how much. The pilot is open
whenever reports have somewhere to go (storage or mail).

1. Send people the link: `https://<backend>/demo.html#report-a-barrier`.
   Links already sent to `/pilot.html` still work: that page sends them on.
2. Read the reports and totals:

   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<backend>/api/pilot/reports
   ```

   `totals.participants` counts distinct devices that sent a report: the
   form keeps a random id in the browser. It is an estimate: a cleared
   browser or a second device counts again. `drafted` and `confirmed` count how
   many reports had a model draft, and how many the participant read and sent.

   Or open the ledger, `https://<backend>/barrier-ledger.html` (since 21 Nov
   2026; `backend/public/barrier-ledger.html` and `.js`). It asks for
   `ADMIN_TOKEN`, keeps it for that tab only, and shows the totals, what
   people use, and one row per report: opened, their words stand beside
   the model's draft. The shown rows download as CSV.
3. Mark whether the scanner caught each barrier. In an opened report, scan
   the page, read the findings beside their words, and save Caught, Missed
   or Can't tell with a note and your name
   (`POST /api/pilot/reports/:id/check`, table `pilot_checks`). A person
   decides this, never the code: matching someone's sentence to a finding
   is a judgement. A second mark never erases the first; Earlier marks
   lists them. Each Missed is a probe to write, with a real page for its
   `qa-*.html` fixture.

What is stored: the participant's own words with what they were asked, their impact rating if an
older form sent one (otherwise `unrated`; the model's estimate stays in the
draft, marked as the model's), the draft as they read it, the model's name, and a hash of the form's device id. Their
name and email are not asked for or stored.

Before you call the pilot "deployed with users", check that
`totals.participants` is above zero on the deployed service. The count only
goes up when real participants send real reports.
