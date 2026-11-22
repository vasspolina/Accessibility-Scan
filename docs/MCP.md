# `a11y-scan-mcp`: the scanner as a tool for a coding assistant

A developer who fixes accessibility with an assistant wants it to do what a
person does: scan the page, read the findings, change the code, scan again.
`a11y-scan-mcp` gives the assistant the scan. It is a Model Context Protocol
server, so it works with any client that speaks the protocol (Claude Code,
Claude Desktop, Cursor, VS Code with Copilot).

It runs on your machine. That is why it can scan `http://localhost:3000`,
which the hosted scanner cannot reach.

## Installing

It is built and linked with the command (see `CLI.md`):

```bash
cd Accessibility-Scan/backend
npm ci
npx playwright install chromium --with-deps
npm link          # puts a11y-scan and a11y-scan-mcp on your PATH
```

Then tell the client about it. For Claude Code:

```bash
claude mcp add a11y-scan -- a11y-scan-mcp
```

For a client that reads a JSON file:

```json
{
  "mcpServers": {
    "a11y-scan": { "command": "a11y-scan-mcp" }
  }
}
```

Set `ANTHROPIC_API_KEY` in the server's environment if you want the AI
review available. Without it scans still run.

## The tools

| Tool | What it does |
| --- | --- |
| `scan_page` | Scans one page. Returns the score, how many WCAG 2.1 A/AA criteria fail, and each finding with its element, markup, rule, criterion, EN 301 549 clause and fix. |
| `scan_site` | Scans several pages, from a sitemap or a list (5 by default, 25 at most), one at a time. Returns each page's findings and the rules that fail on every page. |

A scan takes 15 to 60 seconds for each page.

The answer is text written for the assistant: up to forty findings, most
serious first, and a count of the rest. Screenshots, the screen-reader
script and the conformance table stay out of it. Use the command with
`--json` when you want the whole report.

## What it will and will not say

Every answer ends by telling the assistant that a scan proves the faults it
finds and cannot show a page has none. Without that line an assistant
reports an empty list as "the page is accessible", and that sentence ends
up in a pull request.

When a check did not finish, the answer says which, as the command does.

## Trust

The server scans any `http` or `https` address the assistant gives it,
including `localhost` and private addresses, and refuses `file://`. That is
the command's rule, for the command's reason: the scan runs on the machine
of the person who started it. The difference is who names the address. Here
it is the assistant, so treat this server like any tool that lets an
assistant fetch a page from inside your network, and do not run it where
that would be a problem.

Selectors and markup in the answer are text from the scanned page. The tool
description tells the assistant they are data, not instructions.

## The protocol

JSON-RPC 2.0 over stdin and stdout, one message on each line. The server
answers `initialize`, `ping`, `tools/list` and `tools/call`, in protocol
revisions 2025-06-18, 2025-03-26 and 2024-11-05. It is written by hand in
`backend/src/mcp.ts`, with no SDK. Nothing but protocol messages is written
to stdout: the pipeline's log is turned off and anything else goes to
stderr.
