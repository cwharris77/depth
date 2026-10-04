#!/bin/bash
# Targeted xcodebuild test run. Usage: ios-test.sh <only-testing id>...
# e.g. ios-test.sh DepthTests/TeamStatsViewModelTests 'DepthTests/teamSurfacesParity()'
set -uo pipefail
[ $# -ge 1 ] || { echo "usage: ios-test.sh <only-testing id>..." >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"
sim="${DEPTH_SIM_NAME:-$(xcrun simctl list devices available | grep -m1 -oE 'iPhone [^(]+' | sed 's/ *$//')}"
args=()
for t in "$@"; do args+=("-only-testing:$t"); done
log=$(mktemp -t ios-test)
xcodebuild -project Depth.xcodeproj -scheme Depth \
  -destination "platform=iOS Simulator,name=$sim" test "${args[@]}" >"$log" 2>&1
status=$?
grep -E "error:|Executed [0-9]+ tests|Test run with|\*\* TEST" "$log" | tail -40
# Swift Testing free functions need "()" in the filter; otherwise nothing matches yet it reports success.
if grep -q "Executed 0 tests" "$log" && ! grep -qE "Test run with [1-9]" "$log"; then
  echo "FAIL: zero tests ran — the filter matched nothing. Free functions need parentheses: 'DepthTests/name()'." >&2
  exit 1
fi
echo "full log: $log"
exit $status
