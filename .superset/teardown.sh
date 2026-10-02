#!/usr/bin/env bash
# Stops the dev server this workspace's run script started. Setup starts nothing else.
set -uo pipefail

WORKSPACE="${SUPERSET_WORKSPACE_PATH:-$PWD}"
PORT_FILE="$WORKSPACE/web/.next/superset-port"

[ -f "$PORT_FILE" ] || exit 0
PORT="$(cat "$PORT_FILE")"

# Only kill listeners whose cwd is inside this workspace, never another workspace's server.
for pid in $(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null); do
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
  case "$cwd" in
    "$WORKSPACE"*) kill "$pid" 2>/dev/null || true ;;
  esac
done
rm -f "$PORT_FILE"
