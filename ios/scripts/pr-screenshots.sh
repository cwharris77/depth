#!/usr/bin/env bash
# pr-screenshots.sh — deterministic "screenshots for every UI PR" driver (iOS).
#
# One command does the whole iOS screenshot pass that used to be the GitHub Action
# (which is removed: it was slow and posted a comment instead of filling the PR body).
# It decides targets from the diff, captures before/after on a disposable simulator,
# computes the visual diff, uploads to Cloudinary, and fills the ## Screenshots section
# of a PR body file — so every PR that touches iOS UI ships with evidence in the body.
#
# Usage:
#   ios/scripts/pr-screenshots.sh --body-file <path> [--base <ref>] [-t <csv>] \
#       [-c <config>] [--recapture-base]
#
#   --body-file <path>  PR body (usually built from .github/pull_request_template.md).
#                       In place: fills the ## Screenshots block between the
#                       screenshots-start/end sentinels; strips the whole section when
#                       the diff touches no iOS UI; leaves it with local paths noted
#                       when Cloudinary is unavailable.
#   --base <ref>        Base ref for the "before" side (default: main; falls back to
#                       origin/main, then after-only if neither resolves). The
#                       "before" side is cached by (base sha, target) — see
#                       screenshot-check.sh — so a re-run against the same base is
#                       normally much faster than the first.
#   -t <csv>            Explicit target list — skips diff-based suggestion.
#   -c <config>         Build configuration passed through to screenshot-check.sh
#                       (Debug|Staging|Release). Default: Debug — the local
#                       `supabase start` stack, so a PR shipping data + UI together
#                       renders against the real migrated data. Pass `-c Staging` for
#                       a pure-rendering PR captured against production instead only
#                       with PR_SCREENSHOTS_ALLOW_HOSTED_DATA=1.
#   --recapture-base    Passed through to screenshot-check.sh — discard the cached
#                       "before" PNGs for this base ref and rebuild.
#   --no-capture        Only decide targets + fill/strip the body (no capture).
#   -h, --help          This help.
#
# Reads  CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET (unsigned preset) — same pair
#        /pr-screenshots and /setup-pr-screenshots use. Uploader binary:
#        ~/.config/agents/skills/pr-screenshots/bin/cloudinary-upload (any host).
# Writes ios/.pr-screenshots/{before,after,diff}/ (gitignored) + the edited body file.
# Exit 0 in all non-fatal outcomes — the caller reads the body, not the exit code.
set -uo pipefail

# bash 4+ required for associative arrays; macOS /usr/bin/env bash may be 3.2.
if (( BASH_VERSINFO[0] < 4 )); then
  echo "pr-screenshots: ERROR: needs bash 4+ (system macOS bash is 3.2). Use brew bash:" >&2
  echo "  /opt/homebrew/bin/bash $0 ...   (or fix your PATH so 'bash' resolves to bash 4+)" >&2
  exit 1
fi

BODY_FILE=""
BASE_REF="main"
TARGETS_OVERRIDE=""
NO_CAPTURE=0
CONFIG=""
RECAPTURE_BASE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --body-file) BODY_FILE="${2:?}"; shift 2 ;;
    --base) BASE_REF="${2:?}"; shift 2 ;;
    -t) TARGETS_OVERRIDE="${2:?}"; shift 2 ;;
    -c) CONFIG="${2:?}"; shift 2 ;;
    --recapture-base) RECAPTURE_BASE=1; shift ;;
    --no-capture) NO_CAPTURE=1; shift ;;
    -h|--help) sed -n '1,34p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done
[ -z "$BODY_FILE" ] && { echo "ERROR: --body-file is required" >&2; exit 1; }
[ -f "$BODY_FILE" ] || { echo "ERROR: body file not found: $BODY_FILE" >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ "$CONFIG" = "Staging" ] && [ "${PR_SCREENSHOTS_ALLOW_HOSTED_DATA:-}" != "1" ]; then
  echo "pr-screenshots: ERROR: PR screenshots default to local Debug data; refusing Staging/hosted data." >&2
  echo "pr-screenshots:       Start 'supabase start' and omit -c Staging, or explicitly set" >&2
  echo "pr-screenshots:       PR_SCREENSHOTS_ALLOW_HOSTED_DATA=1 for a production-data capture." >&2
  exit 1
fi

log() { echo "pr-screenshots: $*" >&2; }

# ---- the diff we care about (HEAD vs base; working-tree fallback) ----
GIT_DIFF="$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null)"
[ -z "$GIT_DIFF" ] && GIT_DIFF="$(git status --porcelain 2>/dev/null | awk '{print $2}')"
IOS_TOUCHED="$(printf '%s\n' "$GIT_DIFF" | grep -c '^ios/Depth/' || true)"

# ---- decide targets ----
RESOLVED_TARGETS="$TARGETS_OVERRIDE"
if [ -z "$RESOLVED_TARGETS" ]; then
  RESOLVED_TARGETS="$(ios/scripts/suggest-pr-targets.sh --base "$BASE_REF" 2>/dev/null)"
fi

strip_screenshots_section() {
  python3 - "$BODY_FILE" <<'PY'
import re, sys
p = sys.argv[1]
body = open(p).read()
# Only strip when we can find the section boundary (the end sentinel) — never guess.
if '<!-- screenshots-end -->' in body:
    new = re.sub(r'(?ms)^## Screenshots.*?<!-- screenshots-end -->[ \t]*\n?', '', body)
    open(p, 'w').write(new)
else:
    sys.stderr.write("warning: no screenshots-end sentinel in body — left ## Screenshots alone\n")
PY
}

fill_screenshots_section() {
  local section_file="${1:?}" # pass via argv — a heredoc would steal stdin
  python3 - "$BODY_FILE" "$section_file" <<'PY'
import re, sys
p, sp = sys.argv[1], sys.argv[2]
section = open(sp).read().strip() + '\n'
body = open(p).read()
if '<!-- screenshots-start -->' in body and '<!-- screenshots-end -->' in body:
    # Absorb the template's "## Screenshots" heading + instructions too, so the
    # shipped body keeps only the generated section (which carries its own heading).
    new = re.sub(r'(?ms)^## Screenshots.*?<!-- screenshots-end -->'
                 r'|<!-- screenshots-start -->.*?<!-- screenshots-end -->',
                 lambda m: section, body)
else:
    new = body.rstrip() + '\n\n' + section + '\n'
open(p, 'w').write(new)
PY
}

# ---- non-UI PR: strip the screenshots section, done ----
if [ -z "$TARGETS_OVERRIDE" ] && [ -z "$RESOLVED_TARGETS" ]; then
  if [ "$IOS_TOUCHED" -gt 0 ]; then
    log "iOS sources changed but no capture target covers them — defaulting to field (map gap: add an entry to ios/scripts/pr-target-map.txt)"
    RESOLVED_TARGETS="field"
  else
    strip_screenshots_section
    log "no iOS UI touched — stripped the ## Screenshots section"
    exit 0
  fi
fi

log "targets: $RESOLVED_TARGETS"

# ---- capture ----
if [ "$NO_CAPTURE" -eq 0 ]; then
  SC_ARGS=(-t "$RESOLVED_TARGETS")
  [ -n "$CONFIG" ] && SC_ARGS+=(-c "$CONFIG")
  [ "$RECAPTURE_BASE" -eq 1 ] && SC_ARGS+=(--recapture-base)

  BASE=""
  git cat-file -e "$BASE_REF^{commit}" 2>/dev/null && BASE="$BASE_REF" || true
  if [ -z "$BASE" ] && git cat-file -e "origin/$BASE_REF^{commit}" 2>/dev/null; then BASE="origin/$BASE_REF"; fi
  if [ -n "$BASE" ]; then
    log "capturing before ($BASE, cached when unchanged) + after"
    ios/scripts/screenshot-check.sh "${SC_ARGS[@]}" --base "$BASE" \
      || { echo "pr-screenshots: ERROR: screenshot-check.sh failed — body left untouched" >&2; exit 1; }
  else
    log "base ref '$BASE_REF' not found locally — after-only capture"
    ios/scripts/screenshot-check.sh "${SC_ARGS[@]}" \
      || { echo "pr-screenshots: ERROR: screenshot-check.sh failed — body left untouched" >&2; exit 1; }
  fi
fi

OUT="$REPO_ROOT/ios/.pr-screenshots"
[ -d "$OUT/after" ] || { echo "pr-screenshots: ERROR: no after/ captures at $OUT" >&2; exit 1; }

# ---- upload to Cloudinary (reuses the /pr-screenshots uploader) ----
UP=""
for cand in \
  "$HOME/.config/agents/skills/pr-screenshots/bin/cloudinary-upload" \
  "$HOME/.claude/skills/pr-screenshots/bin/cloudinary-upload"; do
  [ -x "$cand" ] && UP="$cand" && break
done
[ -z "$UP" ] && UP="$(command -v cloudinary-upload 2>/dev/null || true)"

CP_READY=0
if [ -n "$UP" ] && [ -n "${CLOUDINARY_CLOUD_NAME:-}" ] && [ -n "${CLOUDINARY_UPLOAD_PRESET:-}" ]; then
  CP_READY=1
fi

FOLDER="pr-ios-screenshots/$(basename "$REPO_ROOT")/$(git rev-parse --short HEAD 2>/dev/null || echo head)"

upload() {
  local f="$1" url
  url="$("$UP" "$f" --folder "$FOLDER" 2>/dev/null)" && [ -n "$url" ] && { printf '%s\n' "$url"; return 0; }
  url="$("$UP" "$f" --folder "$FOLDER" 2>/dev/null)" && [ -n "$url" ] && { printf '%s\n' "$url"; return 0; }
  return 1
}

# find_first <dir> <target> — the xcresult-exported PNG for a target (e.g. field_0_<uuid>.png
# — screenshot-check.sh renames the export's raw UUID filenames to this via manifest.json)
find_first() {
  [ -d "$1" ] && find "$1" -maxdepth 1 -name "$2*.png" | head -1
}

declare -A BEFORE_URL AFTER_URL DIFF_URL NOTE

if [ "$CP_READY" -eq 1 ]; then
  IFS=',' read -ra TARGETS <<< "$RESOLVED_TARGETS"
  for t in "${TARGETS[@]}"; do
    b="$(find_first "$OUT/before" "$t")"
    a="$(find_first "$OUT/after" "$t")"
    if [ -n "$b" ]; then
      if [ "$(wc -c < "$b")" -le 1024 ]; then
        NOTE["$t"]="before screenshot blank (≤1KB)"
      else
        BEFORE_URL["$t"]="$(upload "$b")" || NOTE["$t"]="before upload failed"
      fi
    fi
    if [ -n "$a" ]; then
      if [ "$(wc -c < "$a")" -le 1024 ]; then
        NOTE["$t"]="${NOTE[$t]:-} after screenshot blank (≤1KB)"
      else
        AFTER_URL["$t"]="$(upload "$a")" || NOTE["$t"]="${NOTE[$t]:-} after upload failed"
      fi
    fi
    d="$OUT/diff/$t.diff.png"
    if [ -f "$d" ]; then
      DIFF_URL["$t"]="$(upload "$d")" || NOTE["$t"]="${NOTE[$t]:-} diff upload failed"
    fi
  done
fi

# ---- verdicts from the visual diff (summary.json) ----
declare -A VERDICT
if [ -f "$OUT/diff/summary.json" ]; then
  while IFS=$'\t' read -r t v p; do
    [ -n "$t" ] && VERDICT["$t"]="$v/$p"
  done < <(python3 - "$OUT/diff/summary.json" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
for target, info in s.items():
    if isinstance(info, dict) and 'verdict' in info:
        print(f"{target}\t{info['verdict']}\t{info.get('changedPct', 0)}")
PY
)
fi

# ---- build the ## Screenshots section ----
SECTION="$(mktemp "${TMPDIR:-/tmp}/pr-shots-section.XXXXXX")"
trap 'rm -f "$SECTION"' EXIT
cat > "$SECTION" <<'EOF'
<!-- screenshots-start -->

## Screenshots

| Target | Before | After | Diff |
| --- | --- | --- | --- |
EOF
IFS=',' read -ra TARGETS <<< "$RESOLVED_TARGETS"
for t in "${TARGETS[@]}"; do
  b="${BEFORE_URL[$t]:-}"; a="${AFTER_URL[$t]:-}"; d="${DIFF_URL[$t]:-}"
  bcell="$([ -n "$b" ] && echo "![before]($b)" || echo "_unavailable_")"
  acell="$([ -n "$a" ] && echo "![after]($a)" || echo "_unavailable_")"
  verdict="${VERDICT[$t]:-}"
  if [ -n "$d" ]; then
    dcell="![diff]($d)"
    [ -n "$verdict" ] && dcell="$dcell <br>_${verdict%%/*} (${verdict##*/}%)_"
  else
    case "$verdict" in
      unchanged/*) dcell="_unchanged_" ;;
      *) dcell="_—_" ;;
    esac
  fi
  printf '| %s | %s | %s | %s |\n' "$t" "$bcell" "$acell" "$dcell" >> "$SECTION"
done
cat >> "$SECTION" <<EOF

_Captured by \`ios/scripts/pr-screenshots.sh\` on a disposable simulator (${CONFIG:-local stack}, stable Bills fixture). Diff = changed regions tinted + boxed._

<!-- screenshots-end -->
EOF

# ---- fill or strip the body ----
if [ "$CP_READY" -eq 1 ]; then
  fill_screenshots_section "$SECTION"
  log "filled ## Screenshots in $BODY_FILE"
else
  log "Cloudinary not configured — keeping local captures, noting paths in the body"
  strip_screenshots_section
  {
    printf '\n## Screenshots\n\n'
    printf 'Captured locally (no Cloudinary configured): `%s` after/ + diff/. Export/upload to embed.\n' "$OUT"
  } >> "$BODY_FILE"
fi

log "done. Screenshots in $OUT (gitignored). Body file: $BODY_FILE"
