#!/usr/bin/env bash
# capture-appstore-screenshots.sh — deterministic App Store screenshot capture for depth.
#
# The one command that turns a clean checkout into the five raw App Store Connect PNGs
# (design spec's Screenshots and metadata section, item 35-38; ticket DEP-162 blocker,
# docs/ios-appstore-screenshots.md). Everything the capture needs to be reproducible
# lives here, so a human (or the ticket's "run the script on a clean checkout" acceptance
# gate) never has to hand-edit project.yml:
#
#   1. Picks the newest 6.9-inch "iPhone N Pro Max"-class simulator device type and boots
#      a DISPOSABLE instance of it (nothing is left booted afterward — same hygiene as
#      screenshot-check.sh, so parallel worktrees don't pile up sims and exhaust RAM).
#   2. Overrides the status bar via `simctl status_bar` — the same "9:41" / charged /
#      full-signal baseline on every capture, since the XCUITest process runs inside the
#      simulator and cannot call simctl itself. This is what makes the status-bar time
#      identical across all five PNGs.
#   3. Runs AppStoreScreenshotsUITests against the dedicated Depth-AppStoreScreenshots
#      scheme (which does NOT carry the default-run `skippedTests` entry the Depth scheme
#      has, so `-only-testing:` works without regenerating project.yml).
#   4. Exports the five XCTAttachment PNGs from the .xcresult and writes them raw — no
#      bezel, no frameit, no caption — to a deterministic output directory:
#
#          Screenshots/<device>/01-team-search.png
#          Screenshots/<device>/02-team-depth-chart.png
#          Screenshots/<device>/03-player-detail.png
#          Screenshots/<device>/04-reorder-editing.png
#          Screenshots/<device>/05-schedule.png
#
#   5. Verifies the artifacts automatically: exactly five files, each at the exact current
#      App Store Connect 6.9-inch portrait resolution (1320×2868) with no alpha channel.
#      The remaining checks in the spec's item 38 (clipping, stale data, placeholder
#      artifacts, simulator chrome, personal information, unlicensed assets) are visual
#      and stay a human-in-the-loop step — the script prints the checklist when done.
#
# The captured PNGs are release artifacts, never source — they're written under a
# gitignored directory and are safe to hand straight to App Store Connect / frameit.
#
# Usage:
#   ios/scripts/capture-appstore-screenshots.sh [-d <derivedDataDir>] [-o <outRoot>] [-h]
#
# Flags:
#   -d <path>  DerivedData dir. Default: ios/.derivedData (gitignored, worktree-local)
#   -o <path>  Output root. Default: <repo-root>/Screenshots (gitignored). The five PNGs
#              land in <outRoot>/<device>/, where <device> is the resolved simulator type
#              slug (e.g. iPhone-17-Pro-Max).
#   -h         Help
#
# Dependencies: xcodegen, xcodebuild, xcrun (simctl/xcresulttool), jq, sips.
#
# Staging config: runs against real production Supabase (xcconfig/Staging.xcconfig's
# TODO(DEP-40 Lane B) — no dedicated staging project exists), same as every other
# DepthUITests run. "Stable staging seed" is the Buffalo Bills, the repo's established
# fixture team; the screenshots never show a signed-in session or real credentials.
set -euo pipefail

# ---- flags ----
DERIVED=""
OUT_ROOT=""
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
while [ $# -gt 0 ]; do
  case "$1" in
    -d) DERIVED="${2:?}"; shift 2 ;;
    -o) OUT_ROOT="${2:?}"; shift 2 ;;
    -h) grep '^#' "$0" | sed '1d;s/^# \?//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

[ -z "$DERIVED" ] && DERIVED="$REPO_ROOT/ios/.derivedData"
[ -z "$OUT_ROOT" ] && OUT_ROOT="$REPO_ROOT/Screenshots"

# The exact App Store Connect 6.9-inch portrait spec (iPhone 17 Pro Max, 1320×2868 @3x).
# Re-check Apple's current screenshot-spec page before a real submission — Apple
# periodically retires the oldest accepted size class and simulator naming shifts with
# each generation (docs/ios-appstore-screenshots.md records this same caveat).
EXPECT_W=1320
EXPECT_H=2868

# ---- resolve a disposable 6.9-inch simulator device type ----
RUNTIME=$(xcrun simctl list runtimes -j | jq -r '[.runtimes[] | select(.platform == "iOS" and .isAvailable)] | sort_by(.version) | last | .identifier')
if [ -z "$RUNTIME" ] || [ "$RUNTIME" = "null" ]; then
  echo "ERROR: no available iOS simulator runtime found" >&2
  exit 1
fi

# A device type being *installed* doesn't mean it's *creatable* against the newest
# runtime (same trap ios-ci.yml's resolve-devices calls out) — test-create and delete
# each 6.9-inch candidate newest-first, keep the first that works.
try_create() {
  local name="$1"
  local device_id
  if device_id=$(xcrun simctl create "appstore-shot-$$-$RANDOM" "$name" "$RUNTIME" 2>/dev/null); then
    xcrun simctl delete "$device_id" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

CANDIDATES=$(xcrun simctl list devicetypes -j | jq -r '
  [.devicetypes[]
    | select(.productFamily == "iPhone" and (.name | test("^iPhone [0-9]+ Pro Max$")))
    | {name, num: (.name | capture("^iPhone (?<n>[0-9]+)") | .n | tonumber)}]
  | sort_by(-.num) | .[].name
')
DEVICE_TYPE=""
while IFS= read -r candidate; do
  [ -z "$candidate" ] && continue
  if try_create "$candidate"; then
    DEVICE_TYPE="$candidate"
    break
  fi
done <<< "$CANDIDATES"
if [ -z "$DEVICE_TYPE" ]; then
  echo "ERROR: no 6.9-inch 'iPhone N Pro Max' device type is both installed and creatable against runtime $RUNTIME" >&2
  exit 1
fi
# e.g. "iPhone 17 Pro Max" -> "iPhone-17-Pro-Max" — the deterministic per-device output dir.
DEVICE_SLUG=$(printf '%s' "$DEVICE_TYPE" | tr ' ' '-')
OUT_DIR="$OUT_ROOT/$DEVICE_SLUG"

# ---- boot a disposable sim, tear everything down on exit ----
DEVICE_ID=$(xcrun simctl create "appstore-shot-$$-$RANDOM" "$DEVICE_TYPE" "$RUNTIME")
cleanup() {
  xcrun simctl status_bar "$DEVICE_ID" clear >/dev/null 2>&1 || true
  xcrun simctl shutdown "$DEVICE_ID" >/dev/null 2>&1 || true
  xcrun simctl delete "$DEVICE_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
echo "Booted disposable 6.9-inch simulator: $DEVICE_TYPE ($DEVICE_ID)" >&2
xcrun simctl boot "$DEVICE_ID"
xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true

# ---- normalize the status bar so every capture shares the same time/signal ----
# The canonical "always the same" status-bar baseline (docs/ios-appstore-screenshots.md).
xcrun simctl status_bar "$DEVICE_ID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3 >/dev/null 2>&1

# ---- build + run the capture test ----
echo "Building + running AppStoreScreenshotsUITests (Staging)…" >&2
( cd "$REPO_ROOT/ios" && xcodegen generate ) >/dev/null 2>&1
mkdir -p "$DERIVED" "$OUT_DIR"
XCRESULT="$DERIVED/.appstore-screenshots.xcresult"
EXPORT_DIR="$DERIVED/.appstore-screenshots-export"
rm -rf "$XCRESULT" "$EXPORT_DIR"
xcodebuild \
  -project "$REPO_ROOT/ios/Depth.xcodeproj" \
  -scheme Depth-AppStoreScreenshots \
  -configuration Staging \
  -destination "platform=iOS Simulator,id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED" \
  -only-testing:DepthUITests/AppStoreScreenshotsUITests \
  -resultBundlePath "$XCRESULT" \
  test 2>&1 | tail -20

# ---- export the XCTAttachment PNGs ----
mkdir -p "$EXPORT_DIR"
xcrun xcresulttool export attachments --path "$XCRESULT" --output-path "$EXPORT_DIR" 2>/dev/null \
  || xcrun xcresulttool get test-results attachments --path "$XCRESULT" --output-path "$EXPORT_DIR" 2>/dev/null \
  || { echo "ERROR: could not export attachments from $XCRESULT" >&2; exit 1; }

# The five attachment names (AppStoreScreenshotsUITests.attachScreenshot). `export
# attachments` writes each as a UUID-named file and records the human-readable name in
# manifest.json — map via the manifest and rename to the deterministic
# "<index>-<name>.png" the docs and App Store Connect workflow expect.
declare -a NAMES=(
  "01-team-search"
  "02-team-depth-chart"
  "03-player-detail"
  "04-reorder-editing"
  "05-schedule"
)
rm -rf "$OUT_DIR"/*.png 2>/dev/null || true
for name in "${NAMES[@]}"; do
  exported=$(jq -r --arg prefix "${name}_" \
    '.[] | .attachments[] | select(.suggestedHumanReadableName | startswith($prefix)) | .exportedFileName' \
    "$EXPORT_DIR/manifest.json" | head -n1)
  [ -z "$exported" ] && { echo "ERROR: no exported attachment for '$name' in $EXPORT_DIR/manifest.json" >&2; exit 1; }
  cp "$EXPORT_DIR/$exported" "$OUT_DIR/$name.png"
done

# ---- verify: exactly five, exact resolution, no alpha ----
PASS=1
COUNT=0
for f in "$OUT_DIR"/*.png; do
  [ -e "$f" ] || continue
  COUNT=$((COUNT + 1))
  W=$(sips -g pixelWidth "$f" | awk '/pixelWidth:/{print $2}')
  H=$(sips -g pixelHeight "$f" | awk '/pixelHeight:/{print $2}')
  ALPHA=$(sips -g hasAlpha "$f" | awk '/hasAlpha:/{print $2}')
  printf '  %-34s %sx%s alpha:%s\n' "$(basename "$f")" "$W" "$H" "$ALPHA"
  if [ "$W" != "$EXPECT_W" ] || [ "$H" != "$EXPECT_H" ]; then
    echo "ERROR: $(basename "$f") is ${W}x${H}, expected ${EXPECT_W}x${EXPECT_H} — the resolved device ($DEVICE_TYPE) is not the accepted 6.9-inch class." >&2
    PASS=0
  fi
  if [ "$ALPHA" != "no" ]; then
    echo "ERROR: $(basename "$f") has an alpha channel (alpha:$ALPHA) — App Store Connect screenshots must be opaque." >&2
    PASS=0
  fi
done
if [ "$COUNT" -ne 5 ]; then
  echo "ERROR: expected 5 screenshots, found $COUNT" >&2
  PASS=0
fi
[ "$PASS" -eq 1 ] || { echo "FAILED verification — fix and re-run." >&2; exit 1; }

echo
echo "Done. Raw captures (unframed, no alpha, ${EXPECT_W}x${EXPECT_H}) in:"
echo "  $OUT_DIR"
for name in "${NAMES[@]}"; do
  echo "    $OUT_DIR/$name.png"
done
echo
echo "Before uploading, inspect every PNG at full size for (design spec item 38):"
echo "  - clipping or placeholder/shimmer artifacts"
echo "  - stale data or inconsistent status-bar time"
echo "  - simulator chrome (bezel — should be none: the framebuffer excludes it)"
echo "  - personal information (none expected: signed-out, Buffalo Bills roster only)"
echo "  - unlicensed assets"
echo "Optional marketing framing (bezel + caption) via frameit — see docs/ios-appstore-screenshots.md."
