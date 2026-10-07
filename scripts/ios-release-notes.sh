#!/usr/bin/env bash
# scripts/ios-release-notes.sh
#
# Drafts release notes for the next iOS build: the app-touching commits (Depth/, project.yml)
# since the previous `ios-v*` tag, grouped by Conventional Commit type, plus the build number
# the target commit would archive as. The output is raw material for the App Store
# "What's New" copy, not the copy itself.
#
# Usage:
#   scripts/ios-release-notes.sh                 # since the latest ios-v* tag, up to HEAD
#   scripts/ios-release-notes.sh <since> [<to>]  # explicit range

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

since="${1:-$(git describe --tags --abbrev=0 --match 'ios-v*' HEAD 2>/dev/null || true)}"
to="${2:-HEAD}"
if [ -z "$since" ]; then
  echo "No ios-v* tag found; pass a starting ref: $0 <since> [<to>]" >&2
  exit 1
fi

echo "iOS changes ${since}..${to} (build $(git rev-list --count "$to") if archived at ${to})"

subjects="$(git log --no-merges --format='%s' "${since}..${to}" -- Depth/ project.yml)"
if [ -z "$subjects" ]; then
  echo
  echo "(no app changes)"
  exit 0
fi

section() {
  local title="$1" pattern="$2" lines
  lines="$(printf '%s\n' "$subjects" | grep -E "$pattern" || true)"
  [ -z "$lines" ] && return 0
  printf '\n%s\n' "$title"
  printf '%s\n' "$lines" | sed 's/^/- /'
}

section "Features" '^feat(\(|:|!)'
section "Fixes" '^fix(\(|:|!)'
other="$(printf '%s\n' "$subjects" | grep -Ev '^(feat|fix)(\(|:|!)' || true)"
if [ -n "$other" ]; then
  printf '\nOther\n'
  printf '%s\n' "$other" | sed 's/^/- /'
fi
