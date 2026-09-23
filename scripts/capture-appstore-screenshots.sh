#!/usr/bin/env bash
# capture-appstore-screenshots.sh — deterministic App Store screenshot capture for depth.
#
# The one command that turns a clean checkout into the seven raw App Store Connect PNGs.
# Everything the capture needs to be reproducible lives here, so a human can run it from a
# clean checkout without hand-editing project.yml:
#
#   1. Picks the newest simulator device type in the 1284×2778 (6.5-inch display) class —
#      iPhone 13 Pro Max, falling back to iPhone 12 Pro Max — and boots a DISPOSABLE
#      instance of it (nothing is left booted afterward, so parallel worktrees don't
#      pile up sims and exhaust RAM).
#   2. Overrides the status bar via `simctl status_bar` — the same "9:41" / charged /
#      full-signal baseline on every capture, since the XCUITest process runs inside the
#      simulator and cannot call simctl itself. This is what makes the status-bar time
#      identical across all five PNGs.
#   3. Runs AppStoreScreenshotsUITests against the dedicated Depth-AppStoreScreenshots
#      scheme (which does NOT carry the default-run `skippedTests` entry the Depth scheme
#      has, so `-only-testing:` works without regenerating project.yml).
#   4. Exports the seven XCTAttachment PNGs from the .xcresult and writes them raw — no
#      bezel, no framing, no caption — to a deterministic output directory:
#
#          Screenshots/<device>/01-depth-chart-offense.png
#          Screenshots/<device>/02-depth-chart-defense.png
#          Screenshots/<device>/03-player-profile.png
#          Screenshots/<device>/04-team-stats.png
#          Screenshots/<device>/05-postseason.png
#          Screenshots/<device>/06-compare.png
#          Screenshots/<device>/07-uniform-archive.png
#
#   5. Verifies the artifacts automatically: exactly seven files, each at the exact current
#      App Store Connect 6.5-inch-display portrait resolution (1284×2778) with no alpha
#      channel. The remaining checks in the spec's item 38 (clipping, stale data, placeholder
#      artifacts, simulator chrome, personal information, unlicensed assets) are visual
#      and stay a human-in-the-loop step — the script prints the checklist when done.
#
# The captured PNGs are release artifacts, never source — they're written under a
# gitignored directory and are safe to hand straight to App Store Connect, or to the
# connected-canvas editor that frames them (app-store-screenshots/).
#
# Usage:
#   scripts/capture-appstore-screenshots.sh [-d <derivedDataDir>] [-o <outRoot>] [-h]
#
# Flags:
#   -d <path>  DerivedData dir. Default: .derivedData (gitignored, worktree-local)
#   -o <path>  Output root. Default: <repo-root>/Screenshots (gitignored). The five PNGs
#              land in <outRoot>/<device>/, where <device> is the resolved simulator type
#              slug (e.g. iPhone-13-Pro-Max).
#   -h         Help
#
# Dependencies: xcodegen, xcodebuild, xcrun (simctl/xcresulttool), jq, sips.
#
# Staging config: runs against the dedicated staging Supabase project
# (`xcconfig/Staging.xcconfig` → djwrecczgudktgsooxti), same as every other DepthUITests
# run against the seeded project from the checked-in `supabase/seed*.sql`. "Stable staging
# seed" means pinned real teams (Seahawks for the
# offense hero, Broncos for defense + the QB profile, Chargers for stats, Patriots for the
# 2025 postseason ladder, and Chiefs/Eagles for compare) rather than fabricated fixture
# data, so reruns stay byte-comparable; the screenshots never show a signed-in session or
# real credentials.
set -euo pipefail

# ---- flags ----
DERIVED=""
OUT_ROOT=""
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
while [ $# -gt 0 ]; do
  case "$1" in
    -d) DERIVED="${2:?}"; shift 2 ;;
    -o) OUT_ROOT="${2:?}"; shift 2 ;;
    -h) grep '^#' "$0" | sed '1d;s/^# \?//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

[ -z "$DERIVED" ] && DERIVED="$REPO_ROOT/.derivedData"
[ -z "$OUT_ROOT" ] && OUT_ROOT="$REPO_ROOT/Screenshots"

# The exact App Store Connect 6.5-inch-display portrait spec (iPhone 13 Pro Max, 1284×2778
# @3x). The 6.5-inch class is required by the current upload flow: App Store Connect
# rejects the 1320×2868 captures outright ("Screenshots dimensions should be:
# 1242 × 2688px … 1284 × 2778px…"), and Apple's current screenshot guide's 6.5-inch class —
# the class this app record's upload flow is accepting — lists exactly 1242×2688 and
# 1284×2778. 1284×2778 is the larger of the two. Apple scales these up for 6.9-inch displays
# ("If screenshots with the accepted sizes aren't provided, scaled screenshots for 6\.9"
# displays are used"), so a 6.5-inch-class set is sufficient. Apple periodically retires the
# oldest accepted size class and simulator naming shifts with each generation, so verify the
# current upload requirements before a real submission.
EXPECT_W=1284
EXPECT_H=2778

# ---- resolve a disposable 1284×2778 (6.5-inch display class) simulator device type ----
RUNTIME=$(xcrun simctl list runtimes -j | jq -r '[.runtimes[] | select(.platform == "iOS" and .isAvailable)] | sort_by(.version) | last | .identifier')
if [ -z "$RUNTIME" ] || [ "$RUNTIME" = "null" ]; then
  echo "ERROR: no available iOS simulator runtime found" >&2
  exit 1
fi

# The 1284×2778 class is exactly the iPhone 12/13 Pro Max devices (428×926pt @3x); iPhone
# 14 Pro Max and later moved to 1290×2796 and are NOT accepted by this app record's upload
# flow. Prefer the newest. A device type being *installed* doesn't mean it's *creatable*
# against the newest runtime (same trap ios-ci.yml's resolve-devices calls out) — test-create
# and delete each candidate newest-first, keep the first that works.
try_create() {
  local name="$1"
  local device_id
  if device_id=$(xcrun simctl create "appstore-shot-$$-$RANDOM" "$name" "$RUNTIME" 2>/dev/null); then
    xcrun simctl delete "$device_id" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

# The 1284×2778 class in the simulator is exactly iPhone 12/13 Pro Max (428×926pt @3x).
# Order newest-first; try_create picks the first candidate that is creatable.
CANDIDATES=$'iPhone 13 Pro Max\niPhone 12 Pro Max'
DEVICE_TYPE=""
while IFS= read -r candidate; do
  [ -z "$candidate" ] && continue
  if try_create "$candidate"; then
    DEVICE_TYPE="$candidate"
    break
  fi
done <<< "$CANDIDATES"
if [ -z "$DEVICE_TYPE" ]; then
  echo "ERROR: no 1284×2778-class device type (iPhone 13/12 Pro Max) is both installed and creatable against runtime $RUNTIME" >&2
  exit 1
fi
# e.g. "iPhone 13 Pro Max" -> "iPhone-13-Pro-Max" — the deterministic per-device output dir.
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
echo "Booted disposable 1284×2778-class simulator: $DEVICE_TYPE ($DEVICE_ID)" >&2
xcrun simctl boot "$DEVICE_ID"
xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true

# ---- normalize the status bar so every capture shares the same time/signal ----
# Use a fixed status-bar baseline so every capture has the same system chrome.
xcrun simctl status_bar "$DEVICE_ID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularBars 4 --wifiBars 3 >/dev/null 2>&1

# ---- build + run the capture test ----
echo "Building + running AppStoreScreenshotsUITests (Staging)…" >&2
( cd "$REPO_ROOT" && xcodegen generate ) >/dev/null 2>&1
mkdir -p "$DERIVED" "$OUT_DIR"
XCRESULT="$DERIVED/.appstore-screenshots.xcresult"
EXPORT_DIR="$DERIVED/.appstore-screenshots-export"
rm -rf "$XCRESULT" "$EXPORT_DIR"
xcodebuild \
  -project "$REPO_ROOT/Depth.xcodeproj" \
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
  "01-depth-chart-offense"
  "02-depth-chart-defense"
  "03-player-profile"
  "04-team-stats"
  "05-postseason"
  "06-compare"
  "07-uniform-archive"
)
rm -rf "$OUT_DIR"/*.png 2>/dev/null || true
for name in "${NAMES[@]}"; do
  exported=$(jq -r --arg prefix "${name}_" \
    '.[] | .attachments[] | select(.suggestedHumanReadableName | startswith($prefix)) | .exportedFileName' \
    "$EXPORT_DIR/manifest.json" | head -n1)
  [ -z "$exported" ] && { echo "ERROR: no exported attachment for '$name' in $EXPORT_DIR/manifest.json" >&2; exit 1; }
  cp "$EXPORT_DIR/$exported" "$OUT_DIR/$name.png"
done

# ---- verify: exactly seven, exact resolution, no alpha ----
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
    echo "ERROR: $(basename "$f") is ${W}x${H}, expected ${EXPECT_W}x${EXPECT_H} — the resolved device ($DEVICE_TYPE) is not the accepted 1284×2778 (6.5-inch) class." >&2
    PASS=0
  fi
  if [ "$ALPHA" != "no" ]; then
    echo "ERROR: $(basename "$f") has an alpha channel (alpha:$ALPHA) — App Store Connect screenshots must be opaque." >&2
    PASS=0
  fi
done
if [ "$COUNT" -ne 7 ]; then
  echo "ERROR: expected 7 screenshots, found $COUNT" >&2
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
echo "  - personal information (none expected: signed-out, public roster data only)"
echo "  - unlicensed assets"
echo "Marketing framing (bezel, copy, backgrounds) is now the connected-canvas editor:"
echo "  cd app-store-screenshots && bun install && bun dev   # http://localhost:3000"
