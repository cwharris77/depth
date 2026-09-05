#!/usr/bin/env bash
# screenshot-check.sh — agent-triggered iOS screenshot capture, run locally.
#
# The local analog of .github/workflows/ios-pr-screenshots.yml: builds an app, boots a
# DISPOSABLE simulator, runs the PRScreenshotsUITests XCUITest (which drives real
# navigation to the requested screens), exports the captured PNGs, then shuts the
# simulator down. By default it captures the CURRENT worktree's code ("after"), and —
# with --base — also a temp base-branch worktree ("before") so you can compare
# rendered changes on your own Mac before opening a PR.
#
# The "before" side is cached by (base ref sha, target) under
# ios/.pr-screenshots-cache/ (gitignored) — the base ref's rendering hasn't changed
# since the last run that captured it, so a repeat run with the same base and targets
# skips the base build + sim entirely and just reuses the cached PNGs. A rebase moves
# what the base ref resolves to, which changes the sha and so the cache key — a
# rebased PR never compares against a stale image. Pass --recapture-base to force a
# fresh base capture regardless of what's cached.
#
# Nothing stays booted and a fresh disposable sim is created per run, so parallel
# worktrees on the same Mac don't pile up sims and exhaust RAM.
#
# Usage:
#   ios/scripts/screenshot-check.sh [-t field,custom-order,field-footer,formations,teams,uniform,player] [--base main] \
#       [-d <derivedDataDir>] [-s <sim-device-type>] [-c <config>] [--recapture-base]
#
# Flags:
#   -t <csv>            Targets to capture (field, field-footer, formations, teams,
#                       uniform, player). Default: field
#   --base <ref>        Capture "before" from this base ref via a temp worktree (e.g.
#                       main), reusing the cache when available.
#   --recapture-base    Discard any cached "before" PNGs for this base ref and rebuild.
#   -d <path>           DerivedData dir. Default: ios/.derivedData (gitignored,
#                       worktree-local)
#   -s <type>           Simulator device type e.g. "iPhone 17 Pro Max". Default:
#                       auto-pick a current flagship (same logic as ios-ci.yml).
#   -c <config>         Build configuration (Debug|Staging|Release). Default: Debug —
#                       Debug.xcconfig points at the local `supabase start` stack
#                       (DEP-270), so a PR that changes data and UI together renders
#                       the "after" side against the real migrated data instead of
#                       stale prod. Pass `-c Staging` to capture against production
#                       Supabase instead (a pure-rendering PR with no local stack up).
#   -h                  Help
#
# When `-c Debug` (the default) is in effect, the script fails loudly before
# capturing anything if the local Supabase stack isn't reachable at 127.0.0.1:54321 —
# rather than silently capturing empty/error screens. Run `supabase start` first.
#
# Outputs PNGs to ./ios/.pr-screenshots/<target>.png (after/) and, with --base, ./before/.
# With --base, after both sides are captured it also runs scripts/diff-pr-screenshots.mts
# to produce ios/.pr-screenshots/diff/<target>.diff.png (screenmap-style before/after
# visual diff — changed regions tinted + boxed) plus diff/summary.json. The status bar
# is frozen at 9:41 on every disposable sim so before/after pixels differ only where
# the app differs.
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
CONFIG="Debug"
RECAPTURE_BASE=0
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
while [ $# -gt 0 ]; do
  case "$1" in
    -t) TARGETS="${2:?}"; shift 2 ;;
    --base) BASE_REF="${2:?}"; shift 2 ;;
    --recapture-base) RECAPTURE_BASE=1; shift ;;
    -d) DERIVED="${2:?}"; shift 2 ;;
    -s) SIM_TYPE="${2:?}"; shift 2 ;;
    -c) CONFIG="${2:?}"; shift 2 ;;
    -h) grep '^#' "$0" | sed '1d;s/^# \?//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

[ -z "$DERIVED" ] && DERIVED="$REPO_ROOT/ios/.derivedData"
OUT_DIR="$REPO_ROOT/ios/.pr-screenshots"
CACHE_DIR="$REPO_ROOT/ios/.pr-screenshots-cache"
mkdir -p "$DERIVED" "$OUT_DIR" "$CACHE_DIR"

# ---- fail loudly instead of silently capturing empty screens against a dead local stack ----
if [ "$CONFIG" = "Debug" ]; then
  if ! curl -s -o /dev/null --max-time 2 "http://127.0.0.1:54321/rest/v1/"; then
    echo "ERROR: -c Debug (the default) captures against the local Supabase stack, but" >&2
    echo "       nothing is reachable at http://127.0.0.1:54321. Run 'supabase start' first," >&2
    echo "       or pass '-c Staging' to capture against production Supabase instead." >&2
    exit 1
  fi
fi

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
  # Freeze the status bar at 9:41 so before/after pixels differ only where the app
  # differs (same trick screenmap uses) — makes the visual diff output meaningful.
  xcrun simctl status_bar override "$DEVICE_ID" --time "9:41" >/dev/null 2>&1 || true

  echo "Building + running PRScreenshotsUITests ($CONFIG, targets: $TARGETS)…" >&2
  ( cd "$wt/ios" && xcodegen generate ) >/dev/null 2>&1
  # Bake the requested targets into the scheme's TestAction env var (the only channel
  # that reliably reaches the XCUITest runner — see project.yml's Depth-PRScreenshots
  # note). The scheme ships with SCREENSHOT_TARGETS=field for CI reproducibility; patch
  # it to the actual targets here so every requested surface resolves in the runner.
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

  # `export attachments` writes each PNG under its raw UUID and records the real name
  # (e.g. "field_0_<uuid>.png", already target-prefixed — see attachScreenshot(name:)
  # in PRScreenshotsUITests.swift) only in manifest.json's suggestedHumanReadableName.
  # Rename on disk so cache_satisfies/find_first's target-prefix globs actually match —
  # same manifest-driven rename capture-appstore-screenshots.sh does.
  if [ -f "$out/manifest.json" ]; then
    while IFS=$'\t' read -r exported human; do
      [ -n "$exported" ] && [ -n "$human" ] && [ -f "$out/$exported" ] && mv -f "$out/$exported" "$out/$human"
    done < <(jq -r '.[] | .attachments[]? | select(.exportedFileName and .suggestedHumanReadableName) | [.exportedFileName, .suggestedHumanReadableName] | @tsv' "$out/manifest.json")
  fi

  # Every sim is fully deleted before returning (not just at script EXIT) so a second
  # capture_one — or the script's caller — never inherits a leaked booted sim.
  cleanup
  trap - EXIT
  echo "Captured → $out" >&2
  find "$out" -maxdepth 1 -name '*.png' -exec echo "  {}" \;
}

# ---- after: current worktree ----
capture_one "$REPO_ROOT" "$OUT_DIR/after" "$OUT_DIR/.xcresult-after"

# ---- before: optional base-branch capture, reusing the (base sha, target) cache ----
# cache_satisfies <dir> — true if <dir> already has a PNG for every requested target
cache_satisfies() {
  local dir="$1"
  [ -d "$dir" ] || return 1
  local t
  for t in "${TARGET_LIST[@]}"; do
    find "$dir" -maxdepth 1 -name "$t*.png" -print -quit | grep -q . || return 1
  done
  return 0
}

if [ -n "$BASE_REF" ]; then
  IFS=',' read -ra TARGET_LIST <<< "$TARGETS"
  BASE_SHA="$(git -C "$REPO_ROOT" rev-parse "$BASE_REF" 2>/dev/null)" \
    || { echo "ERROR: could not resolve base ref '$BASE_REF'" >&2; exit 1; }
  CACHE_ENTRY="$CACHE_DIR/$BASE_SHA"

  if [ "$RECAPTURE_BASE" -eq 0 ] && cache_satisfies "$CACHE_ENTRY"; then
    echo "=== Reusing cached before/ for $BASE_REF ($BASE_SHA) — skipping base build+capture ===" >&2
    rm -rf "$OUT_DIR/before"; mkdir -p "$OUT_DIR/before"
    cp "$CACHE_ENTRY"/*.png "$OUT_DIR/before/"
  else
    WORKTREE="$(mktemp -d)/pr-before"
    echo "Creating base worktree at $WORKTREE from $BASE_REF" >&2
    git -C "$REPO_ROOT" worktree prune 2>/dev/null || true
    git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" "$BASE_REF" 2>/dev/null \
      || { echo "ERROR: could not create worktree at '$BASE_REF'" >&2; exit 1; }
    # remove the base worktree even if capture_one fails mid-way
    capture_one "$WORKTREE" "$OUT_DIR/before" "$OUT_DIR/.xcresult-before" \
      || { echo "ERROR: before-capture failed" >&2; git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force 2>/dev/null || true; exit 1; }
    git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force 2>/dev/null || true
    # merge into the cache — keeps prior targets captured for this sha, adds these
    mkdir -p "$CACHE_ENTRY"
    cp "$OUT_DIR/before"/*.png "$CACHE_ENTRY/" 2>/dev/null || true
  fi
fi

# ---- visual diff: only meaningful when both sides exist ----
if [ -d "$OUT_DIR/before" ] && [ -d "$OUT_DIR/after" ]; then
  if [ -x "$REPO_ROOT/node_modules/.bin/tsx" ]; then
    echo
    echo "=== Computing before/after visual diff (scripts/diff-pr-screenshots.mts)… ===" >&2
    DIFF_DIR="$OUT_DIR/diff"
    mkdir -p "$DIFF_DIR"
    "$REPO_ROOT/node_modules/.bin/tsx" "$REPO_ROOT/scripts/diff-pr-screenshots.mts" \
      --before "$OUT_DIR/before" --after "$OUT_DIR/after" --out "$DIFF_DIR" \
      || echo "WARNING: diff step failed — screenshots are still captured" >&2
  else
    echo "WARNING: tsx not found (npm install) — skipping visual diff" >&2
  fi
fi

echo
echo "Done. PNGs in: $OUT_DIR"
echo "  before/ → $([ -d "$OUT_DIR/before" ] && echo present || echo '(none)')"
echo "  after/  → present"
echo "  diff/   → $([ -d "$OUT_DIR/diff" ] && echo present || echo '(none)')"
