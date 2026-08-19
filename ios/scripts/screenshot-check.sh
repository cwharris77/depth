#!/usr/bin/env bash
# screenshot-check.sh — agent-triggered iOS screenshot capture, run locally.
#
# The local analog of .github/workflows/ios-pr-screenshots.yml: builds an app, boots a
# DISPOSABLE simulator, runs the PRScreenshotsUITests XCUITest (which drives real
# navigation to the requested screens), exports the captured PNGs, then shuts the
# simulator down. By default it captures the CURRENT worktree's code ("after"), and —
# with --before — also a temp base-branch worktree ("before") so you can compare
# rendered changes on your own Mac before opening a PR.
#
# Nothing stays booted and a fresh disposable sim is created per run, so parallel
# worktrees on the same Mac don't pile up sims and exhaust RAM.
#
# Usage:
#   ios/scripts/screenshot-check.sh [-t field,uniform,player] [--base main] \
#       [-d <derivedDataDir>] [-s <sim-device-type>] [-c <config>]
#
# Flags:
#   -t <csv>       Targets to capture (field, uniform, player). Default: field
#   --base <ref>   Capture "before" from this base ref via a temp worktree (e.g. main).
#   -d <path>      DerivedData dir. Default: ios/.derivedData (gitignored, worktree-local)
#   -s <type>      Simulator device type e.g. "iPhone 17 Pro Max". Default: auto-pick a
#                  current flagship (same logic as ios-ci.yml).
#   -c <config>    Build configuration (Debug|Staging|Release). Default: Staging
#   -h             Help
#
# Outputs PNGs to ./ios/.pr-screenshots/<target>.png (after/) and, with --base, ./before/.
# Prints their paths when done. Bundle ID is read from the built app (defaults to
# com.cwharris.depth).
#
# Dependencies: xcodegen, xcodebuild, xcrun simctl, git, jq.
set -euo pipefail

# ---- flags ----
TARGETS="field"
BASE_REF=""
DERIVED=""
SIM_TYPE=""
CONFIG="Staging"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
while [ $# -gt 0 ]; do
  case "$1" in
    -t) TARGETS="${2:?}"; shift 2 ;;
    --base) BASE_REF="${2:?}"; shift 2 ;;
    -d) DERIVED="${2:?}"; shift 2 ;;
    -s) SIM_TYPE="${2:?}"; shift 2 ;;
    -c) CONFIG="${2:?}"; shift 2 ;;
    -h) grep '^#' "$0" | sed '1d;s/^# \?//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

[ -z "$DERIVED" ] && DERIVED="$REPO_ROOT/ios/.derivedData"
OUT_DIR="$REPO_ROOT/ios/.pr-screenshots"
mkdir -p "$DERIVED" "$OUT_DIR"

# ---- resolve a disposable simulator device type ----
RUNTIME=$(xcrun simctl list runtimes -j | jq -r '[.runtimes[] | select(.platform == "iOS" and .isAvailable)] | sort_by(.version) | last | .identifier')
if [ -z "$SIM_TYPE" ]; then
  SIM_TYPE=$(xcrun simctl list devicetypes -j | jq -r '
    [.devicetypes[]
      | select(.productFamily == "iPhone" and (.name | test("^iPhone [0-9]+( Pro)?$")))
      | {name, num: (.name | capture("^iPhone (?<n>[0-9]+)") | .n | tonumber)}]
    | sort_by(-.num) | .[0].name')
fi
[ -z "$SIM_TYPE" ] && { echo "ERROR: no iPhone simulator device type found" >&2; exit 1; }

# ---- capture_one <worktree-dir> <out-dir> <xcresult-bundle> ----
# Builds the app at <worktree-dir>, runs the capture test, exports PNGs into <out-dir>,
# and fully deletes its disposable sim before returning.
capture_one() {
  local wt="$1"; local out="$2"; local rbund="$3"
  echo "=== Capturing $(basename "$wt") → $out ===" >&2

  local DEVICE_ID
  DEVICE_ID=$(xcrun simctl create "prshot-$$-$RANDOM" "$SIM_TYPE" "$RUNTIME" 2>/dev/null || \
    xcrun simctl create "prshot-$$-$RANDOM" "$SIM_TYPE")
  # The current device id is written to a file so the in-call cleanup (and the EXIT
  # trap, if we error mid-call) always shuts down + deletes the right sim.
  echo "$DEVICE_ID" > "$OUT_DIR/.current-device"
  cleanup() {
    local dev
    dev="$(cat "$OUT_DIR/.current-device" 2>/dev/null || echo "$DEVICE_ID")"
    xcrun simctl shutdown "$dev" >/dev/null 2>&1 || true
    xcrun simctl delete "$dev" >/dev/null 2>&1 || true
    rm -f "$OUT_DIR/.current-device"
  }
  trap cleanup EXIT
  echo "Booted disposable sim: $DEVICE_ID" >&2
  xcrun simctl boot "$DEVICE_ID"
  xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true

  echo "Building + running PRScreenshotsUITests ($CONFIG, targets: $TARGETS)…" >&2
  ( cd "$wt/ios" && xcodegen generate ) >/dev/null 2>&1
  # Bake the requested targets into the scheme's TestAction env var (the only channel
  # that reliably reaches the XCUITest runner — see project.yml's Depth-PRScreenshots
  # note). The scheme ships with SCREENSHOT_TARGETS=field for CI reproducibility; patch
  # it to the actual targets here so field/uniform/player all resolve in the runner.
  ( cd "$wt/ios" && \
    perl -0777 -pi -e \
      's#(<EnvironmentVariable\s+key = "SCREENSHOT_TARGETS"\s+value = ")[^"]*(")#${1}'"$TARGETS"'${2}#' \
      Depth.xcodeproj/xcshareddata/xcschemes/Depth-PRScreenshots.xcscheme )
  rm -rf "$rbund"
  # run from the worktree root so the ios/ paths resolve
  ( cd "$wt" && \
    SCREENSHOT_TARGETS="$TARGETS" \
    xcodebuild \
      -project ios/Depth.xcodeproj \
      -scheme Depth-PRScreenshots \
      -configuration "$CONFIG" \
      -destination "platform=iOS Simulator,id=$DEVICE_ID" \
      -derivedDataPath "$DERIVED" \
      -only-testing:DepthUITests/PRScreenshotsUITests \
      -resultBundlePath "$rbund" \
      test 2>&1 | tail -8 ) || { echo "ERROR: capture test failed for $wt" >&2; exit 1; }

  # export
  rm -rf "$out"; mkdir -p "$out"
  xcrun xcresulttool export attachments --path "$rbund" --output-path "$out" 2>/dev/null \
    || xcrun xcresulttool get test-results attachments --path "$rbund" --output-path "$out" 2>/dev/null \
    || { echo "ERROR: could not export attachments from $rbund" >&2; exit 1; }

  # Every sim is fully deleted before returning (not just at script EXIT) so a second
  # capture_one — or the script's caller — never inherits a leaked booted sim.
  cleanup
  echo "Captured → $out" >&2
  find "$out" -maxdepth 1 -name '*.png' -exec echo "  {}" \;
}

# ---- after: current worktree ----
capture_one "$REPO_ROOT" "$OUT_DIR/after" "$OUT_DIR/.xcresult-after"

# ---- before: optional base-branch worktree ----
if [ -n "$BASE_REF" ]; then
  WORKTREE="$(mktemp -d)/pr-before"
  echo "Creating base worktree at $WORKTREE from $BASE_REF" >&2
  git -C "$REPO_ROOT" worktree prune 2>/dev/null || true
  git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" "$BASE_REF" 2>/dev/null \
    || { echo "ERROR: could not create worktree at '$BASE_REF'" >&2; exit 1; }
  # remove the base worktree even if capture_one fails mid-way
  capture_one "$WORKTREE" "$OUT_DIR/before" "$OUT_DIR/.xcresult-before" \
    || { echo "ERROR: before-capture failed" >&2; git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force 2>/dev/null || true; exit 1; }
  git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force 2>/dev/null || true
fi

echo
echo "Done. PNGs in: $OUT_DIR"
echo "  before/ → $([ -d "$OUT_DIR/before" ] && echo present || echo '(none)')"
echo "  after/  → present"