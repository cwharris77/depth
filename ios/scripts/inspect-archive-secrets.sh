#!/usr/bin/env bash
# ios/scripts/inspect-archive-secrets.sh
#
# Enforces the hard rule in AGENTS.md / the native iOS plan: no service-role (or other
# full-access) Supabase secret may ever ship inside the app bundle -- only the public
# SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY values (baked in from ios/xcconfig/*.xcconfig
# via ios/project.yml) may reach Info.plist. Builds an unsigned Release configuration for
# the simulator SDK (a real signed Release *archive* needs distribution certs as CI
# secrets -- out of scope, see task-9c brief; the xcconfig values land in Info.plist
# identically whether the build is signed or not) and greps both Info.plist and the
# compiled binary's string table for any service-role-shaped secret. Runs standalone
# (house convention for scripts -- see docs/espn.md, scripts/vercel-ignore-build.sh) so
# it works locally and from CI without duplicating this logic into ios-ci.yml.
#
# Usage:
#   ios/scripts/inspect-archive-secrets.sh              # build + scan (needs xcodebuild, xcodegen-generated project)
#   ios/scripts/inspect-archive-secrets.sh --self-test   # fast matcher unit test, no build required

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Matching logic -------------------------------------------------------------------
#
# Forbidden literal substrings (matched with `grep -F`). Three of these are base64
# encodings of the JSON claim `"role":"service_role"` at the three possible byte-
# alignments a JWT payload can put it at: base64 groups input in 3-byte chunks, so the
# encoding of a fixed substring shifts depending on how many bytes precede it in the
# surrounding payload. A single hardcoded substring is NOT enough -- verified
# empirically against the well-known Supabase local-dev demo service-role JWT (its
# payload happens to land the claim at alignment 2, not alignment 0), and against 500
# randomized-prefix-length trials in Python covering all three alignments. Re-derive
# with:
#   for k in 0 1 2; do python3 -c "
#   import base64
#   frag='\"role\":\"service_role\"'; pre='#'*$k; suf='#'*((3-($k+len(frag))%3)%3)
#   enc=base64.b64encode((pre+frag+suf).encode()).decode()
#   lead=4 if $k%3 else 0; tail=4 if ($k+len(frag))%3 else 0
#   print(enc[lead:len(enc)-tail] if tail else enc[lead:])"; done
# Do not hand-edit these values without re-running that derivation.
FORBIDDEN_PATTERNS=(
  "service_role"                 # plain-text mentions of the role name
  "InJvbGUiOiJzZXJ2aWNlX3JvbGUi"  # base64("role":"service_role") at byte-alignment 0
  "b2xlIjoic2VydmljZV9yb2xl"      # ...at byte-alignment 1
  "cm9sZSI6InNlcnZpY2Vfcm9s"      # ...at byte-alignment 2 (matches the local demo JWT)
)

# New-format Supabase secret keys look like `sb_secret_<random>` -- but the
# `sb_secret_` prefix ALSO appears as a bare string literal, with no suffix, in
# supabase-swift's own Sources/Helpers/APIKeyFormat.swift (`newFormatPrefixes`, used to
# detect key format at runtime) and therefore in the compiled binary of every app that
# links the SDK, whether or not a service-role key is ever used. Confirmed by building
# this app and running `strings` on the binary: it contains exactly `sb_secret_` with
# nothing appended. A bare-substring check on `sb_secret_` would therefore fail on
# every build. Require a real key body (Supabase secret keys are long random tokens)
# after the prefix so the SDK's own format constant doesn't false-positive.
SECRET_KEY_REGEX='sb_secret_[A-Za-z0-9_-]{8,}'

# Scans a single (already text-decoded) file for every forbidden pattern and prints one
# matching pattern per line to stdout for each hit. Always returns 0 -- callers decide
# what a match means (self-test asserts presence/absence; the real scan treats any
# output as a hard failure) -- so this never trips `set -e` on a clean "no match" grep.
scan_file_for_secrets() {
  local file="$1"
  local pattern
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    grep -Fq -- "$pattern" "$file" 2>/dev/null && echo "$pattern" || true
  done
  grep -Eq -- "$SECRET_KEY_REGEX" "$file" 2>/dev/null && echo "sb_secret_<key>" || true
  return 0
}

# --- Self-test --------------------------------------------------------------------
#
# Exercises scan_file_for_secrets against fixtures in a temp dir -- no Xcode build
# required, so this runs fast as a standalone matcher unit test. The real
# build-and-scan path (against an actual compiled bundle) is exercised separately by
# the ios-ci.yml `archive-secret-check` job.
run_self_test() {
  echo "Running inspect-archive-secrets.sh matcher self-test..."
  local tmp
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN

  local failures=0

  # Clean file: nothing should match.
  printf 'SUPABASE_URL=https://example.supabase.co\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_abc123\n' \
    >"$tmp/clean.txt"
  if [ -z "$(scan_file_for_secrets "$tmp/clean.txt")" ]; then
    echo "PASS: clean fixture matched nothing"
  else
    echo "FAIL: clean fixture matched a forbidden pattern: $(scan_file_for_secrets "$tmp/clean.txt")"
    failures=$((failures + 1))
  fi

  # Dirty: a key-shaped sb_secret_ value (prefix + a real-looking random body).
  printf 'oops sb_secret_deadbeefdeadbeef leaked\n' >"$tmp/secret-key.txt"
  if [ -n "$(scan_file_for_secrets "$tmp/secret-key.txt")" ]; then
    echo "PASS: key-shaped sb_secret_ fixture caught"
  else
    echo "FAIL: key-shaped sb_secret_ fixture not caught"
    failures=$((failures + 1))
  fi

  # Clean: the bare `sb_secret_` prefix with nothing appended -- this is exactly what
  # supabase-swift's own APIKeyFormat.swift compiles into every linking app's binary
  # (verified via `strings` against a real Release build of this app). Must NOT be
  # flagged, or this check would fail on every single build.
  printf 'sb_secret_\n' >"$tmp/sdk-prefix-constant.txt"
  if [ -z "$(scan_file_for_secrets "$tmp/sdk-prefix-constant.txt")" ]; then
    echo "PASS: bare sb_secret_ (SDK format-constant shape) NOT flagged"
  else
    echo "FAIL: bare sb_secret_ (SDK format-constant shape) was incorrectly flagged: $(scan_file_for_secrets "$tmp/sdk-prefix-constant.txt")"
    failures=$((failures + 1))
  fi

  # Dirty: plain-text service_role mention.
  printf 'role=service_role\n' >"$tmp/plain-role.txt"
  if scan_file_for_secrets "$tmp/plain-role.txt" | grep -Fq "service_role"; then
    echo "PASS: plain-text service_role fixture caught"
  else
    echo "FAIL: plain-text service_role fixture not caught"
    failures=$((failures + 1))
  fi

  # Dirty: a service-role JWT claim base64-encoded at each of the three possible
  # byte-alignments, embedded in a JWT-shaped string (header.payload.signature) -- this
  # is what the compiled binary's `strings` output would actually contain.
  local k prefix payload encoded fixture
  for k in 0 1 2; do
    prefix=""
    for ((i = 0; i < k; i++)); do
      prefix+="X"
    done
    payload="${prefix}\"role\":\"service_role\""
    encoded=$(printf '%s' "$payload" | base64 | tr -d '\n')
    fixture="$tmp/jwt-align-$k.txt"
    printf 'eyJhbGciOiJIUzI1NiJ9.%s.signature\n' "$encoded" >"$fixture"
    if [ -n "$(scan_file_for_secrets "$fixture")" ]; then
      echo "PASS: JWT byte-alignment $k fixture caught"
    else
      echo "FAIL: JWT byte-alignment $k fixture NOT caught (encoded fragment: $encoded)"
      failures=$((failures + 1))
    fi
  done

  if [ "$failures" -gt 0 ]; then
    echo "Self-test FAILED: $failures assertion(s) failed."
    return 1
  fi
  echo "Self-test PASSED."
  return 0
}

# --- Build + scan -----------------------------------------------------------------
run_build_and_scan() {
  echo "Building Depth (Release, unsigned, iphonesimulator SDK) to inspect for secrets..."
  local derived_data
  derived_data="$(mktemp -d)"
  # Double-quoted (not single-quoted) so $derived_data expands immediately, at trap-set
  # time -- it's a `local` var, so a deferred single-quoted expansion would try to read
  # it after the function has already returned (once the trap fires on script EXIT),
  # which is unbound under `set -u` and clobbers an otherwise-successful scan's exit code.
  # shellcheck disable=SC2064
  trap "rm -rf '$derived_data'" EXIT

  if ! xcodebuild build \
    -project "$IOS_DIR/Depth.xcodeproj" \
    -scheme Depth \
    -configuration Release \
    -sdk iphonesimulator \
    CODE_SIGNING_ALLOWED=NO \
    -derivedDataPath "$derived_data"; then
    echo "::error::Release build failed; cannot inspect the archive for secrets." >&2
    exit 1
  fi

  local app_path
  app_path=$(find "$derived_data/Build/Products" -maxdepth 2 -iname "Depth.app" -type d | head -n1)
  if [ -z "$app_path" ]; then
    echo "::error::Could not locate built Depth.app under $derived_data/Build/Products." >&2
    exit 1
  fi
  echo "Inspecting $app_path"

  local info_plist="$app_path/Info.plist"
  if [ ! -f "$info_plist" ]; then
    echo "::error::Expected Info.plist not found at $info_plist." >&2
    exit 1
  fi

  # Sanity check: confirm the scan is actually inspecting a real built bundle -- if
  # SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY are missing or empty, an all-clear result
  # from the pattern scan below would be meaningless.
  local url_value key_value
  url_value=$(plutil -extract SUPABASE_URL raw -o - "$info_plist" 2>/dev/null || true)
  key_value=$(plutil -extract SUPABASE_PUBLISHABLE_KEY raw -o - "$info_plist" 2>/dev/null || true)
  if [ -z "$url_value" ] || [ -z "$key_value" ]; then
    echo "::error::Sanity check failed: SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY missing or empty in $info_plist -- scan may not be inspecting a real built bundle." >&2
    exit 1
  fi
  echo "Sanity check passed: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are present and non-empty."

  local exe_name binary
  exe_name=$(plutil -extract CFBundleExecutable raw -o - "$info_plist" 2>/dev/null || echo "Depth")
  binary="$app_path/$exe_name"
  if [ ! -f "$binary" ]; then
    echo "::error::Expected compiled binary not found at $binary." >&2
    exit 1
  fi

  local violations=0 target text_dump match
  for target in "$info_plist" "$binary"; do
    text_dump="$(mktemp)"
    # `strings` extracts printable text regardless of whether the source is a binary
    # plist or a Mach-O executable, so both files are scanned the same way.
    strings -a "$target" >"$text_dump"
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      echo "::error::Forbidden secret pattern '$match' found in $target" >&2
      violations=$((violations + 1))
    done < <(scan_file_for_secrets "$text_dump")
    rm -f "$text_dump"
  done

  if [ "$violations" -gt 0 ]; then
    echo "FAILED: $violations forbidden secret pattern occurrence(s) found in the built app bundle." >&2
    exit 1
  fi

  echo "OK: no service-role-shaped secrets found in Info.plist or the compiled binary."
}

main() {
  if [ "${1:-}" = "--self-test" ]; then
    run_self_test
    exit $?
  fi
  run_build_and_scan
}

main "$@"
