# Plain-language model and the assistive-technology pilot

Two features that share one small language model you host yourself.

1. **The plain-language rewrite.** During a scan, the model rewrites each axe
   rule's findings into a plain title, an explanation about this page's
   elements, and a fix. Code: `backend/src/services/plainLanguage/`.
2. **The pilot.** A form at `/pilot.html` where invited screen-reader and
   keyboard users report a barrier in their own words. The same model drafts
   a structured finding from it. The participant checks and corrects the
   draft before it is sent. Code: `backend/src/services/pilot/`,
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
| `PILOT_CODES` | Comma-separated codes, one per participant. Absent: the pilot is closed. |
| `DB_PATH` (+ `DB_DURABLE`) | Where pilot reports are stored. Use a mounted volume. |
| `MAIL_API_KEY`, `MAIL_FROM` | Optional: each pilot report is also mailed to `CONTACT_TO`. |
| `ADMIN_TOKEN` | Needed to read the pilot's reports and totals. |

The pilot form will not start unless reports have somewhere to go (storage
or mail), so a participant never writes into a pilot that cannot keep it.

## How the rewrite behaves

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

1. Make one code per person, e.g. `river-41,stone-07,lake-19`, and set
   `PILOT_CODES`.
2. Send each person their link: `https://<backend>/pilot.html?code=river-41`.
   The page fills in the code and removes it from the address bar.
3. Read the reports and totals:

   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<backend>/api/pilot/reports
   ```

   `totals.participants` counts distinct codes that sent a report.
   `codesIssued` is how many codes exist. `drafted` and `confirmed` count how
   many reports had a model draft, and how many drafts the participant said
   were right.

What is stored: the participant's own words, their own impact rating, the
draft (as they left it), the model's name, and a hash of their code. Their
code, name and email are not stored.

Before you call the pilot "deployed with users", check that
`totals.participants` is above zero on the deployed service. The count only
goes up when real participants send real reports.
