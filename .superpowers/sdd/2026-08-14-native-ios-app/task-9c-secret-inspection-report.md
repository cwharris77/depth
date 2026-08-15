# Task 9C: Archive-secret inspection — report

## What was built

`ios/scripts/inspect-archive-secrets.sh` — a standalone, dependency-free bash script that:

1. Builds `Depth` in `Release` configuration, unsigned, for the `iphonesimulator` SDK into
   a scratch derived-data directory (cleaned up on exit via a trap).
2. Locates the built `Depth.app`, then sanity-checks that `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` are present and non-empty in its `Info.plist` — proof the
   scan is inspecting a real, correctly-configured bundle rather than silently passing
   against an empty/wrong path.
3. Extracts printable text from both `Info.plist` and the compiled binary (via
   `strings -a`, which works uniformly on a binary plist and a Mach-O executable) and
   scans both for forbidden secret-shaped patterns.
4. Exits non-zero with a clear `::error::` message (pattern + file) on any match; exits 0
   with a one-line summary otherwise.
5. Supports `--self-test`, a fast, build-free unit test of the matching logic against
   fixture files in a temp dir.

Added a new `archive-secret-check` job to `.github/workflows/ios-ci.yml` that runs on
every PR/push touching `ios/**` (same trigger as the existing `test` job), duplicating
the checkout/Xcode-select/xcodegen-generate/project-sync-check steps (per the brief's
guidance — a broader refactor of a CI file another task just landed felt like
unnecessary risk for this PR) and then runs the self-test followed by the real
build-and-scan.

## Matching logic and a real finding along the way

The brief's forbidden-pattern list:
- `sb_secret_` (new-format secret-key prefix)
- `service_role` (plain text)
- one base64 substring for the local demo JWT's `"role":"service_role"` claim,
  `InJvbGUiOiJzZXJ2aWNlX3JvbGUi`, with an instruction to verify it before hardcoding.

**Verification surfaced a real correctness gap in the brief's approach**, not just a
formality: base64 groups input in 3-byte chunks, so the byte-encoding of a fixed
substring shifts depending on how many bytes precede it in the surrounding payload.
`InJvbGUiOiJzZXJ2aWNlX3JvbGUi` is correct only when the claim happens to land at
byte-alignment 0. I derived and validated (500 randomized-prefix-length trials in
Python, plus the real thing) that the **well-known Supabase local-dev demo
service-role JWT** — the exact credential this check exists to catch, and the one
`SupabaseRLSIntegrationTests.swift` documents as "local-only, safe to appear in the
check's own denylist/test fixtures" — lands its claim at **alignment 2**, not
alignment 0. A single hardcoded substring would have silently missed it. The script
now checks all three alignments:
- `InJvbGUiOiJzZXJ2aWNlX3JvbGUi` (alignment 0 — the brief's original substring)
- `b2xlIjoic2VydmljZV9yb2xl` (alignment 1)
- `cm9sZSI6InNlcnZpY2Vfcm9s` (alignment 2 — matches the real local demo JWT)

Full derivation is documented inline in the script's header comment (re-runnable
one-liner included) so the values aren't opaque hex-looking magic strings.

**A second real finding, only visible by actually running the check against a real
build**: the bare `sb_secret_` substring check fails on *every single build* of this
app, with no leaked secret involved. `supabase-swift`'s own
`Sources/Helpers/APIKeyFormat.swift` hardcodes `"sb_secret_"` as a bare prefix-matching
constant (`newFormatPrefixes`, used to detect key format at runtime) — that literal
compiles into the binary of every app linking the SDK. Confirmed via `strings` on a
real Release build: the binary contains exactly `sb_secret_` with nothing appended,
twice (property + a usage site), and the SDK source has the corresponding line. A
substring-only check would have permanently red-lit this CI job.

Fix: require a real key body after the prefix (`sb_secret_[A-Za-z0-9_-]{8,}`, `grep -E`)
so the SDK's own bare-prefix constant doesn't false-positive, while a genuinely embedded
secret (which is always the prefix *plus* a long random token) is still caught. Both
directions are covered by dedicated self-test fixtures (`sb_secret_deadbeef...` must be
caught; a bare `sb_secret_\n` line, modeling the SDK's exact compiled shape, must not
be).

A third, smaller bug found only by running the real build-and-scan path (not just
`--self-test`): the derived-data cleanup trap (`trap 'rm -rf "$derived_data"' EXIT`)
used deferred single-quoted expansion on a function-`local` variable — once the
function returned and the trap fired at script exit, `$derived_data` was unbound under
`set -u`, silently flipping an otherwise-successful scan's exit code to failure. Fixed
by switching to immediate (double-quoted) expansion at trap-set time, matching the
already-correct pattern used in the self-test's `RETURN` trap.

## Self-test approach

A self-contained shell-function suite invoked via `--self-test`, not bats/shellspec —
grepped the repo first and found neither already in use anywhere (`scripts/` uses plain
bash + `npm test`/Vitest for TS, nothing shell-test-framework-specific). Adding a new
test-framework dependency for one script felt like more than this task needs; the
house convention documented in the brief ("a self-contained shell test function... is
an acceptable, dependency-free alternative") fits directly.

Fixtures cover: a clean file (nothing should match), a key-shaped `sb_secret_` value
(must be caught), the SDK's bare-prefix shape (must NOT be caught — the regression this
task's own investigation surfaced), a plain-text `service_role` mention, and JWTs with
the `"role":"service_role"` claim base64-encoded at all three byte-alignments (each
constructed live with the `base64` CLI, not hardcoded, so the test independently
verifies the hardcoded patterns rather than assuming them).

## Test evidence

- `ios/scripts/inspect-archive-secrets.sh --self-test` → all 7 assertions PASS.
- `ios/scripts/inspect-archive-secrets.sh` (real Release build + scan, local, Xcode 26 /
  macOS, ~27s wall time) → `BUILD SUCCEEDED`, sanity check passed, `OK: no
  service-role-shaped secrets found in Info.plist or the compiled binary.`, exit 0.
- Confirmed the pre-fix version of the script does fail loudly and correctly when a
  genuinely embedded `sb_secret_` prefix (the SDK's own constant, before the
  suffix-length fix) is present — i.e., watched it catch a real embedded string in a
  real build before narrowing the pattern, so the narrowing is verified not to have
  quietly disabled detection.
- `cd ios && xcodegen generate` → no diff (`git diff --exit-code -- ios/Depth.xcodeproj`
  clean); no new Xcode-project source files were added, only a shell script + CI YAML.
- Full house verification command:
  `xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`
  → `** TEST SUCCEEDED **`, all 9 test-executable groups passed (DepthTests,
  PerformanceMetricsTests, AuthUITests, DepthUITests, PerformanceUITests, ShareUITests,
  etc.), 0 failures.
- `bash -n ios/scripts/inspect-archive-secrets.sh` → syntax OK. `shellcheck` is not
  installed in this environment, so it wasn't run; nothing in house convention requires
  it for shell scripts.
- YAML validity of the modified `.github/workflows/ios-ci.yml` checked with
  `ruby -ryaml -e "YAML.load_file(...)"` → valid.

## Scope notes

- No real signed Release archive is attempted (needs distribution certs as repo
  secrets — out of scope per the brief and AGENTS.md's escalation rules on adding
  secrets). The unsigned `iphonesimulator` Release build inspects the identical
  xcconfig-baked `Info.plist` values.
- `Staging.xcconfig` pointing at production (`TODO(DEP-40 Lane B)`) is untouched and
  not flagged by this check — only service-role-*shaped* secrets fail it, as directed.
- One concern per PR: this PR is the secret-inspection script + its CI job only.
