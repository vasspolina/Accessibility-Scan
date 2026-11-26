# The scanner as a Claude Code skill

Anyone with Claude Code can add the scanner as a skill. Claude then scans a
page when asked ("check localhost:3000 for accessibility", "is our pricing
page WCAG AA?"), reads the findings, fixes the code and scans again.

## Installing

In Claude Code:

```
/plugin marketplace add vasspolina/Accessibility-Scan
/plugin install a11y-scan@accessibility-scan
```

That is all. The first scan fetches this repository, runs `npm ci` and
downloads the pinned Chromium into the plugin's own data folder (a few
minutes, once); later scans take 15 to 60 seconds a page. It needs Node 24
or later and git on the machine. On Linux, Chromium may also need its system
libraries; the script prints the one line to run if so.

If `a11y-scan` is already on your `PATH` (from `npm link` in a checkout, or
the npm package once published), the skill uses that and installs nothing.

## What is in it

| File | What it does |
| --- | --- |
| `.claude-plugin/marketplace.json` | makes this repository a plugin marketplace |
| `plugins/a11y-scan/.claude-plugin/plugin.json` | the plugin |
| `plugins/a11y-scan/skills/a11y-scan/SKILL.md` | what Claude reads: when to scan, how, the fix loop, and what a scan can and cannot prove |
| `plugins/a11y-scan/skills/a11y-scan/scripts/scan.sh` | installs the scanner on first use, then runs the command with the arguments given |

The script runs the same command as `docs/CLI.md`, with the same options and
exit codes (0 thresholds met, 1 a threshold missed, 2 the scan could not be
completed). `scan.sh --setup` installs without scanning, `scan.sh --update`
pulls the latest `main`. `A11Y_SCAN_BIN` points it at another build,
`A11Y_SCAN_REF` at another branch or tag.

## Without the plugin system

Copy `plugins/a11y-scan/skills/a11y-scan/` into `~/.claude/skills/` (for
yourself) or `.claude/skills/` in a project (for everyone who works on it).

## Skill or MCP server

`docs/MCP.md` describes `a11y-scan-mcp`, the same scanner as an MCP tool.
The skill needs no setup beyond the two lines above and can write SARIF,
JUnit, CSV, baselines and tickets; the MCP server suits clients other than
Claude Code. Either one scans `localhost`, so the trust note in `MCP.md`
holds for both: the assistant names the address and the scan runs on your
machine.

The skill is for Claude Code (and anything else that runs skills with a
shell, Node and network). In claude.ai the code sandbox cannot download and
run Chromium, so it will not scan there.
