#!/usr/bin/env bash
# Boots only the local Edge runtime, passes local credentials without printing them, and
# always stops the worker. The Supabase database itself must already be running.
set -euo pipefail

eval "$(supabase status -o env)"
export API_URL ANON_KEY SERVICE_ROLE_KEY JWT_SECRET

t7_function_log="$(mktemp)"
supabase functions serve account-delete >"$t7_function_log" 2>&1 &
t7_function_pid=$!

cleanup() {
  kill "$t7_function_pid" 2>/dev/null || true
  wait "$t7_function_pid" 2>/dev/null || true
  rm -f "$t7_function_log"
}
trap cleanup EXIT

for _ in {1..40}; do
  if rg --quiet 'Serving functions' "$t7_function_log"; then
    break
  fi
  if ! kill -0 "$t7_function_pid" 2>/dev/null; then
    sed -n '1,120p' "$t7_function_log"
    exit 1
  fi
  sleep 0.25
done

if ! rg --quiet 'Serving functions' "$t7_function_log"; then
  echo 'Timed out waiting for local Edge Function runtime' >&2
  exit 1
fi

npx tsx supabase/functions/account-delete/integration.mts
