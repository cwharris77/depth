#!/usr/bin/env bash
# Shuts down and deletes the simulator that run.sh created for this workspace.
set -uo pipefail

WORKSPACE="${SUPERSET_WORKSPACE_PATH:-$PWD}"
UDID_FILE="$WORKSPACE/.derivedData/superset-sim-udid"

[ -f "$UDID_FILE" ] || exit 0
UDID="$(cat "$UDID_FILE")"

xcrun simctl shutdown "$UDID" 2>/dev/null || true
xcrun simctl delete "$UDID" 2>/dev/null || true
rm -f "$UDID_FILE"
