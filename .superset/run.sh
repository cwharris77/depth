#!/usr/bin/env bash
# Starts the Next.js dev server on a free port so parallel workspaces don't collide.
set -euo pipefail

WORKSPACE="${SUPERSET_WORKSPACE_PATH:-$PWD}"
cd "$WORKSPACE/web"
mkdir -p .next
PORT_FILE=.next/superset-port

port_free() {
  python3 - "$1" <<'PY'
import socket, sys
s = socket.socket()
try:
    s.bind(('127.0.0.1', int(sys.argv[1])))
except OSError:
    sys.exit(1)
PY
}

# Reuse the workspace's previous port on restart, otherwise ask the OS for a free one.
PORT=""
if [ -f "$PORT_FILE" ]; then
  prev="$(cat "$PORT_FILE")"
  if port_free "$prev"; then PORT="$prev"; fi
fi
if [ -z "$PORT" ]; then
  PORT="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')"
fi
echo "$PORT" > "$PORT_FILE"

echo "dev server: http://localhost:$PORT"
exec npx next dev -p "$PORT"
