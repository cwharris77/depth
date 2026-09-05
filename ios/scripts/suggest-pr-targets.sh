#!/usr/bin/env bash
# suggest-pr-targets.sh — diff-driven PR-screenshot target suggestion.
#
# Works out which capture targets a git diff can reach, using the small
# target→source-file map in ios/scripts/pr-target-map.txt. This is the depth-app
# (native SwiftUI) analog of screenmap's "suspects" logic: match the diff's changed
# files against the sources each capture target exercises, then suggest the union.
#
# Usage:
#   ios/scripts/suggest-pr-targets.sh [--base <ref>] [--map <path>] [--explain]
#
#   --base <ref>   Refs to compare HEAD against (default: main). Uses a three-dot
#                  diff (changes since the merge-base). Falls back to the working
#                  tree when the ref doesn't exist (no main yet).
#   --explain      Print each matching changed file and the targets it maps to.
#   -h/--help      This help.
#
# Prints a comma-separated target list to stdout — e.g. "field,uniform" — or
# nothing when the diff reaches no capture target, in which case the caller's
# documented default (`field`) applies.
set -euo pipefail

# bash 4+ required for associative arrays; macOS /usr/bin/env bash may be 3.2.
if (( BASH_VERSINFO[0] < 4 )); then
  echo "suggest-pr-targets: ERROR: needs bash 4+ (system macOS bash is 3.2). Use brew bash:" >&2
  echo "  /opt/homebrew/bin/bash $0 ...   (or fix your PATH so 'bash' resolves to bash 4+)" >&2
  exit 1
fi

BASE_REF="main"
MAP=""
EXPLAIN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE_REF="${2:?}"; shift 2 ;;
    --map) MAP="${2:?}"; shift 2 ;;
    --explain) EXPLAIN=1; shift ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -z "$MAP" ] && MAP="$REPO_ROOT/ios/scripts/pr-target-map.txt"
[ -f "$MAP" ] || { echo "ERROR: no target map at $MAP" >&2; exit 1; }

# ---- changed files: HEAD vs base (three-dot = since merge-base); working-tree fallback ----
CHANGED=""
if git -C "$REPO_ROOT" cat-file -e "$BASE_REF^{commit}" 2>/dev/null; then
  CHANGED="$(git -C "$REPO_ROOT" diff --name-only "$BASE_REF"...HEAD 2>/dev/null || true)"
fi
if [ -z "$CHANGED" ]; then
  CHANGED="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | awk '{print $2}')"
fi
[ -z "$CHANGED" ] && { echo "(working tree clean — no targets)" >&2; exit 0; }

CANONICAL=(field custom-order field-footer formations teams uniform player settings)

# match_targets <file> — echoes the comma CSV of map targets that <file> hits ("" if none).
match_targets() {
  local file="$1" out=""
  while IFS=$'\t' read -r targets prefix; do
    # skip blank lines and #-comments
    [ -z "$targets" ] && continue
    case "$targets" in \#*) continue ;; esac
    local p="${prefix%/}" # tolerate trailing-slash dir specs
    if [ "$file" = "$p" ] || [[ "$file" == "$p/"* ]]; then
      out="$out,$targets"
    fi
  done < "$MAP"
  echo "${out#,}"
}

declare -A SELECTED
FOUND=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  # only app sources can map (map paths all live under ios/Depth/)
  [[ "$file" == ios/Depth/* ]] || continue
  m="$(match_targets "$file")"
  [ -z "$m" ] && continue
  FOUND=1
  [ "$EXPLAIN" -eq 1 ] && printf '  %-58s -> %s\n' "$file" "$m"
  IFS=',' read -ra parts <<< "$m"
  for p in "${parts[@]}"; do
    if [ "$p" = "all" ]; then
      for t in "${CANONICAL[@]}"; do SELECTED[$t]=1; done
    else
      SELECTED[$p]=1
    fi
  done
done <<< "$CHANGED"

if [ "$FOUND" -eq 0 ]; then
  [ "$EXPLAIN" -eq 1 ] && echo "  (no changed file reaches a capture target)"
  exit 0
fi

OUT=()
for t in "${CANONICAL[@]}"; do [ -n "${SELECTED[$t]:-}" ] && OUT+=("$t"); done
printf '%s\n' "$(IFS=,; echo "${OUT[*]}")"
