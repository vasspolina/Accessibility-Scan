#!/usr/bin/env bash
# Runs the Accessibility Scan command, installing it once on first use.
#
#   scan.sh <a11y-scan arguments...>     e.g. scan.sh http://localhost:3000 --json r.json
#   scan.sh --setup                      install only, scan nothing
#
# Where it comes from, in order:
#   1. A11Y_SCAN_BIN, if set (a path to dist/cli.js or an a11y-scan binary).
#   2. `a11y-scan` on PATH (npm link from a checkout, or the npm package once published).
#   3. A checkout of github.com/vasspolina/Accessibility-Scan kept in
#      $CLAUDE_PLUGIN_DATA (or ~/.cache/a11y-scan-skill), built with npm ci.
#
# Setup messages go to stderr, so stdout is only the scanner's own output.
# Exit codes are the scanner's: 0 thresholds met, 1 a threshold missed,
# 2 the scan could not be completed. Setup failure is 2 as well.
set -euo pipefail

REPO_URL="${A11Y_SCAN_REPO:-https://github.com/vasspolina/Accessibility-Scan.git}"
REF="${A11Y_SCAN_REF:-main}"
HOME_DIR="${CLAUDE_PLUGIN_DATA:-${XDG_CACHE_HOME:-$HOME/.cache}/a11y-scan-skill}"
CHECKOUT="$HOME_DIR/Accessibility-Scan"
CLI="$CHECKOUT/backend/dist/cli.js"
# The checkout's Chromium lives beside it, so the whole install is one folder
# to delete and never touches the user's own Playwright cache.
BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-$HOME_DIR/ms-playwright}"
# Written only after every install step succeeded: a download that failed
# halfway leaves a browsers folder behind, so the folder proves nothing.
READY="$HOME_DIR/.ready"

say() { printf 'a11y-scan skill: %s\n' "$*" >&2; }
fail() { say "$*"; exit 2; }

need_node() {
  command -v node >/dev/null 2>&1 || fail "Node 24 or later is needed and node is not on PATH. Install it from https://nodejs.org and run again."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 24 ] || fail "Node 24 or later is needed; this is Node $(node -v). Install a newer one and run again."
}

install_checkout() {
  need_node
  command -v git >/dev/null 2>&1 || fail "git is needed to fetch the scanner."
  mkdir -p "$HOME_DIR"
  if [ ! -d "$CHECKOUT/.git" ]; then
    say "first run: fetching the scanner into $CHECKOUT (one time, a few minutes)"
    git clone --depth 1 --branch "$REF" "$REPO_URL" "$CHECKOUT" >&2 || fail "could not clone $REPO_URL"
  fi
  say "installing dependencies and building (npm ci)"
  (cd "$CHECKOUT/backend" && npm ci --no-audit --no-fund >&2) || fail "npm ci failed in $CHECKOUT/backend"
  # The scanner pins Playwright; its own Chromium must match, so install through
  # the checkout's Playwright, not a global one.
  say "installing the pinned Chromium (Playwright)"
  (cd "$CHECKOUT/backend" && PLAYWRIGHT_BROWSERS_PATH="$BROWSERS" npx playwright install chromium >&2) \
    || fail "Chromium install failed. On Linux the system libraries may be missing; run once: cd \"$CHECKOUT/backend\" && PLAYWRIGHT_BROWSERS_PATH=\"$BROWSERS\" npx playwright install chromium --with-deps"
  [ -f "$CLI" ] || fail "build finished but $CLI is missing"
  git -C "$CHECKOUT" rev-parse HEAD > "$READY"
  say "ready"
}

update_checkout() {
  [ -d "$CHECKOUT/.git" ] || { install_checkout; return; }
  say "updating the scanner"
  rm -f "$READY"
  git -C "$CHECKOUT" fetch --depth 1 origin "$REF" >&2 || fail "could not fetch $REF"
  git -C "$CHECKOUT" reset --hard FETCH_HEAD >&2 || fail "could not move the checkout to $REF"
  install_checkout
}

resolve() {
  if [ -n "${A11Y_SCAN_BIN:-}" ]; then
    if [[ "$A11Y_SCAN_BIN" == *.js ]]; then RUN=(node "$A11Y_SCAN_BIN"); else RUN=("$A11Y_SCAN_BIN"); fi
  elif command -v a11y-scan >/dev/null 2>&1; then
    RUN=(a11y-scan)
  else
    if [ ! -f "$CLI" ] || [ ! -f "$READY" ]; then install_checkout; fi
    need_node
    export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS"
    RUN=(node "$CLI")
  fi
}

case "${1:-}" in
  --setup)  resolve; say "using: ${RUN[*]}"; exit 0 ;;
  --update) update_checkout; exit 0 ;;
  "")       fail "give a URL to scan, e.g. scan.sh http://localhost:3000" ;;
esac

resolve
exec "${RUN[@]}" "$@"
