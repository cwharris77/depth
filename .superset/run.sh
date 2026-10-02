#!/usr/bin/env bash
# Builds the Depth scheme into a workspace-local DerivedData and launches it on a simulator
# dedicated to this workspace, so parallel workspaces never share or clobber a device.
set -euo pipefail

WORKSPACE="${SUPERSET_WORKSPACE_PATH:-$PWD}"
NAME="${SUPERSET_WORKSPACE_NAME:-$(basename "$WORKSPACE")}"
cd "$WORKSPACE"

DERIVED="$WORKSPACE/.derivedData"
UDID_FILE="$DERIVED/superset-sim-udid"
DEVICE_NAME="superset-$NAME"
mkdir -p "$DERIVED"

UDID=""
if [ -f "$UDID_FILE" ]; then
  UDID="$(cat "$UDID_FILE")"
  xcrun simctl list devices | grep -q "$UDID" || UDID=""
fi
if [ -z "$UDID" ]; then
  RUNTIME="$(xcrun simctl list runtimes -j | python3 -c '
import json, sys
rts = [r for r in json.load(sys.stdin)["runtimes"] if r["isAvailable"] and r["identifier"].startswith("com.apple.CoreSimulator.SimRuntime.iOS")]
print(sorted(rts, key=lambda r: [int(p) for p in r["version"].split(".")])[-1]["identifier"])')"
  UDID="$(xcrun simctl create "$DEVICE_NAME" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro "$RUNTIME")"
  echo "$UDID" > "$UDID_FILE"
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$UDID" || echo "Simulator.app not found; running headless"

xcodebuild -project Depth.xcodeproj -scheme Depth -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$DERIVED" build

APP="$DERIVED/Build/Products/Debug-iphonesimulator/Depth.app"
BUNDLE_ID="$(plutil -extract CFBundleIdentifier raw "$APP/Info.plist")"
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch --terminate-running-process "$UDID" "$BUNDLE_ID"
echo "launched $BUNDLE_ID on $DEVICE_NAME ($UDID)"
