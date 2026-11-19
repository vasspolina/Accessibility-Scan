# Plain-language model and the assistive-technology pilot

Two features that share one small language model you host yourself.

1. **The plain-language rewrite.** During a scan, the model rewrites each axe
   rule's findings into a plain title, an explanation about this page's
   elements, and a fix. Code: `backend/src/services/plainLanguage/`.
2. **The pilot.** A form at `/pilot.html` where invited screen-reader and
   keyboard users report a barrier in their own words. The same model drafts
   a detailed finding from it on its own. The participant reads it and sends
   it. Code: `backend/src/services/pilot/`,
   `backend/src/routes/pilot.ts`, `backend/public/pilot.html`.

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

The form asks for as little as it can: the page's address, one sentence
about what happened, and how much it held the participant back. The address
field reads what was typed the way a chat would (`POST /api/pilot/page`,
`services/pilot/readAddress.ts`): spaces, commas or "dot" before a domain
ending become dots, https:// goes in front, and a host that does not
resolve is passed to Claude (when `ANTHROPIC_API_KEY` is set) for the address
the person meant, kept only if that host resolves. "acsessobilty nl" reads as
https://accessibility.nl. The form shows the reading under the field, puts
it in the field once the person leaves it, and stops once on submit if a
guess has not been shown yet; a sentence typed there moves to "What
happened?". Only text nothing can be made of is an error. The page is then
looked up (every hop goes through the SSRF guard and only the title comes
back), its title shown under the field and given to the model as context.

Since 19 Nov 2026 the form asks only for the address, a sentence and what
the person uses: no impact rating, no "which one", no "what were you trying
to do". The model writes one finding at length (what happens, who it stops,
how to see it, what to change, its estimate of how much it holds people
back, and a suggested criterion), shown as finished text with one Send
button; to change it, the person goes back and changes what they wrote.
"What happened" is optional when an address is given: the
page is then scanned (no AI review, no screenshots) and the model drafts one
finding from the most serious measured problems, worded as what the scan
found, never as what the participant met. The form says so on the review
screen, and the stored report marks the draft `fromScan`. The participant's assistive technology is remembered in their own browser,
so a second report is the address and a sentence.

There is no invitation code (removed 17 Nov 2026): anyone with the link can
report, and the routes' rate limits bound how much. The pilot is open
whenever reports have somewhere to go (storage or mail).

1. Send people the link: `https://<backend>/pilot.html`. An old link with
   `?code=` still works; the code is ignored and taken out of the address bar.
2. Read the reports and totals:

   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<backend>/api/pilot/reports
   ```

   `totals.participants` counts distinct devices that sent a report: the
   form keeps a random id in the browser. It is an estimate: a cleared
   browser or a second device counts again. `drafted` and `confirmed` count how
   many reports had a model draft, and how many the participant read and sent.

What is stored: the participant's own words, their impact rating if an
older form sent one (otherwise `unrated`; the model's estimate stays in the
draft, marked as the model's), the draft as they read it, the model's name, and a hash of the form's device id. Their
name and email are not asked for or stored.

Before you call the pilot "deployed with users", check that
`totals.participants` is above zero on the deployed service. The count only
goes up when real participants send real reports.
